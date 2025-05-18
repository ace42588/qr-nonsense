import { useRef, useEffect, useState } from "react";
import { useQRData, useQRDataDispatch } from "../state";
import { evaluateQRCodeQuality } from "../domain/qr";

function getCanvasContext(canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return null;
  return canvas.getContext("2d");
}

function getCanvasDrawConfig(matrix, canvas) {
  const dimension = matrix.length;
  const quietZone = 4;
  const totalDimension = dimension + quietZone * 2;
  const moduleSize = canvas.width / totalDimension;
  return { dimension, quietZone, moduleSize };
}

function drawMatrixLayer(ctx, matrix, config) {
  const { dimension, quietZone, moduleSize } = config;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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
    }
  }
}

function drawHighlightLayer(ctx, matrix, highlightedIds, config) {
  const { dimension, quietZone, moduleSize } = config;
  const highlightedSet = new Set(highlightedIds);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y][x];
      if (!m || !highlightedSet.has(m.bitId)) continue;

      ctx.strokeRect(
        (x + quietZone) * moduleSize,
        (y + quietZone) * moduleSize,
        moduleSize,
        moduleSize
      );
    }
  }
}

export function QRCodeCanvas() {
  const qrRef = useRef(null);
  const highlightRef = useRef(null);
  const { highlightedIds, matrix } = useQRData();
  const { highlightSegment } = useQRDataDispatch();
  //console.debug("QRCodeCanvas", { matrix, highlightedIds });

  useEffect(() => {
    const ctx = getCanvasContext(qrRef);
    if (!ctx || !matrix) return;

    const config = getCanvasDrawConfig(matrix, ctx.canvas);
    drawMatrixLayer(ctx, matrix, config);
  }, [matrix]);

  useEffect(() => {
    const ctx = getCanvasContext(highlightRef);
    if (!ctx || !matrix) return;

    const config = getCanvasDrawConfig(matrix, ctx.canvas);
    drawHighlightLayer(ctx, matrix, highlightedIds, config);
  }, [highlightedIds, matrix]);

  const handleClick = (event) => {
    event.preventDefault();

    const canvas = highlightRef.current;
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
      <div className="qr-canvas-wrapper">
        <canvas id="qrCode" ref={qrRef} width="420" height="420"></canvas>
        <canvas
          id="canvas"
          ref={highlightRef}
          width="420"
          height="420"
          onClick={handleClick}
          onContextMenu={handleClick} // Handle right-click as well
          style={{ border: "1px solid #000" }}
        ></canvas>
      </div>
    </div>
  );
}
