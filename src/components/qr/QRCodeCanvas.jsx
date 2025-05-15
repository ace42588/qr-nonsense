import { useRef, useEffect, useState } from "react";
import "../styles/styles.css";

import { useQRData, useQRDataDispatch } from "../../state";
import { evaluateQRCodeQuality } from "../../domain/qr";

export function QRCodeCanvas() {
  const canvasRef = useRef(null);
  const { highlightedIds, matrix } = useQRData();
  const { highlightSegment } = useQRDataDispatch();
  //console.debug("QRCodeCanvas", { matrix, highlightedIds });

  const isHighlighted = (id) => highlightedIds.includes(id);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix) return;

    const ctx = canvas.getContext("2d");

    const draw = () => {
      const dimension = matrix.length;
      const quietZone = 4;
      const totalDimension = dimension + quietZone * 2;
      const moduleSize = canvas.width / totalDimension;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < dimension; y++) {
        for (let x = 0; x < dimension; x++) {
          const m = matrix[y][x];
          if (!m) continue;

          ctx.fillStyle = m.isDark ? "black" : "white";
          ctx.fillRect(
            (x + quietZone) * moduleSize,
            (y + quietZone) * moduleSize,
            moduleSize,
            moduleSize
          );

          if (highlightedIds.includes(m.bitId)) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              (x + quietZone) * moduleSize,
              (y + quietZone) * moduleSize,
              moduleSize,
              moduleSize
            );
          }
        }
      }
    };

    requestAnimationFrame(draw);
  }, [matrix, highlightedIds]);

  const handleClick = (event) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas || !matrix) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const moduleSize = canvas.scrollWidth / (matrix.length + 8); // +8 for both sides
    const xIndex = Math.floor(x / moduleSize) - 4;
    const yIndex = Math.floor(y / moduleSize) - 4;

    if (
      xIndex < 0 ||
      yIndex < 0 ||
      xIndex >= matrix.length ||
      yIndex >= matrix.length
    )
      return;

    const module = matrix[yIndex]?.[xIndex];
    if (!module) return;

    console.debug(module);

    if (module.bit.sourceId) highlightSegment(module.bit.sourceId);
  };

  return (
    <div className="qr-code-canvas-container">
      <canvas
        id="canvas"
        ref={canvasRef}
        width="420"
        height="420"
        onClick={handleClick}
        onContextMenu={handleClick} // Handle right-click as well
        style={{ border: "1px solid #000" }}
      ></canvas>
    </div>
  );
}
