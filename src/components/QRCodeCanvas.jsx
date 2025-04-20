import React, { useRef, useEffect, useState } from "react";
import "./styles.css";

import { Actions } from "../Constants";
import { useQRData, useQRDataDispatch } from "../context/QRDataContext";

export default function QRCodeCanvas() {
  const canvasRef = useRef(null);
  const { matrix, bitMap } = useQRData();
  const dispatch = useQRDataDispatch();

  useEffect(() => {
    if (!canvasRef.current || !matrix) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dimension = matrix.length;
    const moduleSize = canvas.width / dimension;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < dimension; y++) {
      const row = matrix[y];
      //console.debug({row});
      for (let x = 0; x < dimension; x++) {
        const m = row[x];
        //console.debug({m});
        if (!m) continue;

        ctx.fillStyle = m.isDark ? "black" : "white";
        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);

        if (m.isHighlighted) {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            x * moduleSize,
            y * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }, [matrix]);

  const handleClick = (event) => {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas || !matrix) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const moduleSize = canvas.scrollWidth / matrix.length;
    const xIndex = Math.floor(x / moduleSize);
    const yIndex = Math.floor(y / moduleSize);

    const module = matrix[yIndex]?.[xIndex];
    if (!module) return;

    if (event.type === "click") {
      console.log(module.bit);
      console.log(bitMap);
      const source = bitMap.get(module.bit.id);
      if (source) console.log({ source });
    } else if (event.type === "contextmenu") {
      // Toggle value and update source
      dispatch({ type: Actions.ToggleModule, module });
    }
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
