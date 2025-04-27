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
    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = async () => {
      if (!canvasRef.current || !matrix) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const dimension = matrix.length;
      const quietZone = 4;
      const totalDimension = dimension + quietZone * 2;
      const moduleSize = size / totalDimension;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);

      // Fill entire canvas with white (including quiet zone)
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);

      for (let y = 0; y < dimension; y++) {
        for (let x = 0; x < dimension; x++) {
          const m = matrix[y][x];
          const centerX = (x + 0.5) * moduleSize;
          const centerY = (y + 0.5) * moduleSize;
          if (!m) continue;

          if (m.nonData) {
            ctx.beginPath();
            ctx.fillStyle = m.isDark ? "black" : "white";
            ctx.fillRect(
              (x + quietZone) * moduleSize,
              (y + quietZone) * moduleSize,
              moduleSize,
              moduleSize
            );
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
          const imgIsDark = brightness < 127;
          
          if ((m.isDark && imgIsDark) {
            // img is dark
            ctx.fillStyle = `rgb(${r},${g},${b})`;
          } else if (m.isDark && !imgIsDark) {
            // draw the img, then a black dot
          } else if (!m.isDark && imgIsDark) {
            // draw the img, then a white dot
          } else if (!m.isDark && !imgIsDark) {
            // img is bright
          }

          ctx.fillStyle = m.isDark
            ? brightness < 127
              ? `rgb(${r},${g},${b})`
              : "black"
            : brightness > 127
            ? `rgb(${r},${g},${b})`
            : "white";
          ctx.fillRect(
            (x + quietZone) * moduleSize,
            (y + quietZone) * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    };
    return () => {
      isMounted = false;
    };
  }, [matrix]);

  return (
    <canvas
      id="halftone"
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
