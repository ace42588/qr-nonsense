import React, { useRef, useEffect } from "react";
//import QRCode from "qrcode";
import { useQRData } from "../../state";

function getBrightness(r, g, b) {
  // Perceived brightness
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function QRImageHalftone({
  text = "https://openai.com",
  imageUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=256&q=80",
  size = 320,
  minDot = 1,
  maxDot = 7,
}) {
  const { matrix } = useQRData();
  const canvasRef = useRef();

  useEffect(() => {
    if (!canvasRef.current || !matrix) return;

    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = async () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const dimension = matrix.length;
      const quietZone = 4;
      const totalDimension = dimension + quietZone * 2;
      const moduleSize = size / totalDimension;

      // 2. Draw image scaled to canvas
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);

      // 3. Overlay dots for QR modules
      ctx.clearRect(0, 0, size, size); // Clear for clean drawing

      const dotMargin = 0.14; // 0 = full square, ~0.14 = more space between dots

      // Helper: Finder pattern?
      function isFinder(x, y) {
        const inPattern = (a, b) =>
          (a < 7 && b < 7) || // top-left
          (a > dimension - 8 && b < 7) || // top-right
          (a < 7 && b > dimension - 8); // bottom-left
        return inPattern(x, y);
      }

      // Fill entire canvas with white (including quiet zone)
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < dimension; y++) {
        for (let x = 0; x < dimension; x++) {
          const m = matrix[y][x];
          if (!m) continue;

          const centerX = (x + 0.5) * moduleSize;
          const centerY = (y + 0.5) * moduleSize;

          // Finder patterns: always black or white, always max dot
          if (isFinder(x, y)) {
            ctx.beginPath();
            ctx.fillRect(
              (x + quietZone) * moduleSize,
              (y + quietZone) * moduleSize,
              moduleSize,
              moduleSize
            );
            ctx.fillStyle = m.isDark ? "#000" : "#fff";
            ctx.fill();
            continue;
          }

          // Sample image at center of module
          const px = Math.floor(centerX);
          const py = Math.floor(centerY);
          const idx = (py * size + px) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const brightness = getBrightness(r, g, b); // 0..255

          // Determine dot size (map brightness to range)
          const t = brightness / 255;
          const dotRadius = minDot + (maxDot - minDot) * (m.isDark ? t : 1 - t);

          ctx.beginPath();
          ctx.arc(
            centerX + quietZone,
            centerY + quietZone,
            dotRadius,
            0,
            2 * Math.PI
          );
          ctx.fillStyle = m.isDark ? "#000" : "#fff";
          ctx.shadowColor = m.isDark ? "#fff" : "#000";
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.fill();
        }
      }
    };
  }, [matrix]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        boxShadow: "0 2px 10px #0002",
        display: "block",
      }}
    />
  );
}
