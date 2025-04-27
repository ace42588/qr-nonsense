import React, { useRef, useEffect } from "react";
//import QRCode from "qrcode";
import { useQRData } from "../../state";

// Bayer 4x4 matrix (for ordered dithering)
const BAYER_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function getBrightness(r, g, b) {
  // Perceived brightness
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function QRImageHalftone({
  text = "https://defcon.org/images/defcon-33/dc33-logo.webp",
  imageUrl = "https://cdn.glitch.global/18921864-7cab-44f6-a895-dad8926b3c21/defcon_k_skull-reg_cropped.jpg?v=1745787807417",
  size = 480,
  subDivs = 3,
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

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(
        quietZone,
        quietZone,
        size - quietZone,
        size - quietZone
      );

      // Fill entire canvas with white (including quiet zone)
      //ctx.clearRect(0, 0, size, size);
      //ctx.fillStyle = "white";
      //ctx.fillRect(0, 0, size, size);

      const moduleSize = size / totalDimension;
      const subSize = moduleSize / subDivs;

      // Helper to get brightness at canvas (0..1)
      function getBrightness(x, y) {
        const ix = Math.max(0, Math.min(size - 1, Math.floor(x)));
        const iy = Math.max(0, Math.min(size - 1, Math.floor(y)));
        const idx = (iy * size + ix) * 4;
        const [r, g, b] = [
          imgData.data[idx],
          imgData.data[idx + 1],
          imgData.data[idx + 2],
        ];
        // Perceived brightness (normalize to 0..1)
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }

      for (let y = 0; y < dimension; y++) {
        for (let x = 0; x < dimension; x++) {
          const m = matrix[y][x];
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

          const centerX = (x + 0.5 + quietZone) * moduleSize;
          const centerY = (y + 0.5 + quietZone) * moduleSize;
          const brightness = getBrightness(centerX, centerY); // 0..1

          // Sample image at center of module
          const px = Math.floor(centerX);
          const py = Math.floor(centerY);
          const idx = (py * size + px) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const imgIsDark = brightness < 0.5;

          // Light module: dither with Bayer or other halftoning
          for (let sy = 0; sy < subDivs; ++sy) {
            for (let sx = 0; sx < subDivs; ++sx) {
              // Bayer threshold
              const threshold = (BAYER_4x4[sy % 4][sx % 4] + 0.5) / 16;
              if (brightness < threshold) {
                ctx.fillStyle = "#111";
              } else {
                ctx.fillStyle = "#fff";
              }
              ctx.fillRect(
                x * moduleSize + sx * subSize,
                y * moduleSize + sy * subSize,
                subSize,
                subSize
              );
            }
          }
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
