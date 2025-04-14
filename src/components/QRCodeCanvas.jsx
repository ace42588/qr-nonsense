import React, { useRef, useEffect, useState } from "react";
import "./styles.css";

import { FormatInfo } from "../encode/FormatInfo";
import {
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
} from "../encode/FunctionPatterns";
import { VersionInfo } from "../encode/VersionInfo";
import { createBlocks } from "../encode/Block";
import { RemainderBit, ECBit } from "../encode/TaggedBitstream";

import { useQRData, useQRDataDispatch } from "../context/QRDataContext";
import { QRUtils } from "../Utilities";

const DATA_MASKS = [
  (p) => (p.y + p.x) % 2 === 0,
  (p) => p.y % 2 === 0,
  (p) => p.x % 3 === 0,
  (p) => (p.y + p.x) % 3 === 0,
  (p) => (Math.floor(p.y / 2) + Math.floor(p.x / 3)) % 2 === 0,
  (p) => ((p.x * p.y) % 2) + ((p.x * p.y) % 3) === 0,
  (p) => (((p.y * p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
  (p) => (((p.y + p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
];

const REMAINDER_BIT = new RemainderBit();

const createMatrix = (errorCorrectionLevel, version, dataMask) => {
  const numModules = version * 4 + 17;
  const matrix = Array.from({ length: numModules }, () =>
    Array(numModules).fill(false)
  );
  FinderPattern.populate(matrix);
  TimingPattern.populate(matrix);
  const alignmentPattern = new AlignmentPattern(version);
  alignmentPattern.populate(matrix);
  const formatInfo = new FormatInfo({ errorCorrectionLevel, dataMask });
  formatInfo.populate(matrix);
  const versionInfo = new VersionInfo(version);
  versionInfo.populate(matrix);

  return matrix;
};

const generateMatrix = (qrData, errorCorrectionLevel, version, dataMask) => {
  console.debug({ qrData });
  const matrix = createMatrix(errorCorrectionLevel, version, dataMask);
  let bitIdx = 0;
  let up = true;
  const dimension = matrix.length;
  // write columns in pairs, right to left
  for (let columnIdx = dimension - 1; columnIdx > 0; columnIdx -= 2) {
    // Skip the vertical timing pattern column
    if (columnIdx === 6) columnIdx--;

    for (let i = 0; i < dimension; i++) {
      const y = up ? dimension - 1 - i : i;

      for (let columnOffset = 0; columnOffset < 2; columnOffset++) {
        let x = columnIdx - columnOffset;

        // check for pattern
        if (!matrix[y][x]) {
          let taggedBit;
          if (bitIdx < qrData.length) {
            taggedBit = qrData[bitIdx++];
          } else {
            taggedBit = REMAINDER_BIT;
          }

          const isMasked = DATA_MASKS[dataMask]({ x, y });
          matrix[y][x] = {
            ...taggedBit,
            x,
            y,
            isMasked,
            isHighlighted: false,
          };
        }
      }
    }
    up = !up; // Change direction
  }
  return matrix;
};

function QRCodeCanvas({
  bitStream,
  setBitStream,
  errorCorrectionLevel,
  version,
  dataMask,
}) {
  const canvasRef = useRef(null);
  const qrData = useQRData();
  let matrix;
  let moduleSize = 0;

  if (qrData) {
    if (dataMask === "auto") {
      // ignore for now
      dataMask = 0;
    }

    matrix = generateMatrix(qrData, errorCorrectionLevel, version, dataMask);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (matrix) {
      moduleSize = canvas.width / matrix.length;

      // Draw the QR code on the canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          const module = matrix[y][x];
          const { value, isMasked } = matrix[y][x];
          const isDark = isMasked ? !value : value;
          ctx.fillStyle = isDark ? "black" : "white";
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);

          // Draw a border if highlighted
          if (module && module.isHighlighted) {
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
    }
  }, [matrix]);

  const handleClick = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xIndex = Math.floor(x / moduleSize);
    const yIndex = Math.floor(y / moduleSize);

    const module = matrix[yIndex][xIndex];
    if (module) {
      console.log(module);
      //const newModule = {...module};
      //if (event.type === "click") {
      //  newModule.highlight = !module.highlight;
      //} else if (event.type === "contextmenu") {
      //  module.toggleBit();
      //}
    }
    return false;
  };

  return (
    <canvas
      ref={canvasRef}
      width="420"
      height="420"
      onClick={handleClick}
      onContextMenu={handleClick} // Handle right-click as well
      style={{ border: "1px solid #000" }}
    ></canvas>
  );
}

export default QRCodeCanvas;
