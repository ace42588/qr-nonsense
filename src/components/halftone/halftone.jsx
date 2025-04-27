import React, { useRef, useEffect, useState, useCallback } from "react";

function Halftone({
  src,
  dotSize,
  gap,
  scale,
  width,
  height,
  dotColor = "#222",
  bgColor = "#fff",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      // Prepare temp canvas for image pixel data
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.fillStyle = bgColor;
      tempCtx.fillRect(0, 0, width, height);
      tempCtx.drawImage(img, 0, 0, width, height);

      // Get image data
      const imageData = tempCtx.getImageData(0, 0, width, height);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Halftone
      for (let y = 0; y < height; y += dotSize + gap) {
        for (let x = 0; x < width; x += dotSize + gap) {
          const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = imageData.data[idx];
          const g = imageData.data[idx + 1];
          const b = imageData.data[idx + 2];
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          const radius = ((255 - luminance) / 255) * (dotSize / 2) * scale;
          if (radius < 0.2) continue;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }
      }
    };
  }, [src, dotSize, gap, scale, width, height, dotColor, bgColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: width,
        height: height,
        display: "block",
        background: bgColor,
        borderRadius: 8,
        boxShadow: "0 2px 10px #0002",
      }}
    />
  );
}

export default Halftone;
