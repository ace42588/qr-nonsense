import React, { useRef, useEffect } from "react";
//import QRCode from "qrcode";
import { useQRData } from "../../state";

export default function QRImageHalftone({
  text = "https://openai.com",
  imageUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=256&q=80",
  size = 256,
  dotSize = 8,
}) {
  const { matrix } = useQRData();
  const canvasRef = useRef();

  useEffect(() => {
    if (matrix === null) return;
    let isMounted = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = async () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Draw image, scale to fit canvas
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      // Get image data for color sampling
      const imgData = ctx.getImageData(0, 0, size, size);

      // Generate QR matrix (using qrcode package)
      //const qr = await QRCode.create(text, { errorCorrectionLevel: "H" });
      //const qrModules = qr.modules.data;
      //const qrSize = qr.modules.size;
      //const modulePixelSize = size / qrSize;
      
      const qrModules = matrix.flat();
      const qrSize = matrix.length;
      const modulePixelSize = size / qrSize;

      // Clear and re-draw image as background (optional)
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      // Draw QR modules as dots with sampled image color
      for (let r = 0; r < qrSize; ++r) {
        for (let c = 0; c < qrSize; ++c) {
          const m = matrix[r][c];
          if (qrModules[r * qrSize + c]) {
            // Get image color at module center
            const cx = Math.round((c + 0.5) * modulePixelSize);
            const cy = Math.round((r + 0.5) * modulePixelSize);
            const idx =
              ((cy % size) * size + (cx % size)) * 4;
            const [rC, gC, bC] = [
              imgData.data[idx],
              imgData.data[idx + 1],
              imgData.data[idx + 2],
            ];

            // Optional: make finder patterns solid (black)
            const isFinder =
              (r < 7 && c < 7) ||
              (r < 7 && c >= qrSize - 7) ||
              (r >= qrSize - 7 && c < 7);

            ctx.beginPath();
            ctx.arc(
              cx,
              cy,
              isFinder
                ? modulePixelSize / 2
                : (dotSize / 2) * ((rC + gC + bC) / (255 * 3) * 0.7 + 0.3), // size varies with brightness
              0,
              2 * Math.PI
            );
            ctx.fillStyle = isFinder
              ? "#000"
              : `rgb(${rC},${gC},${bC})`;
            ctx.globalAlpha = 1;
            ctx.fill();
          }
        }
      }
    };
    return () => {
      isMounted = false;
    };
  }, [text, imageUrl, size, dotSize]);

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
