import React, { useRef, useEffect, useState } from "react";
import "./QRCodeCanvas.css";

import { FormatInfo } from "../../encode/FormatInfo";
import { getMinimumQRCodeVersion } from "../../utility";
import {
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
} from "../../encode/FunctionPatterns";
import { VersionInfo } from "../../encode/VersionInfo";
import { VERSIONS } from "../../encode/version";
import { RemainderBit, ECBit } from "../../encode/TaggedBit";
import { createBlocks } from "../../encode/Block";

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

const orderBits = (bitStream, errorCorrectionLevel, version) => {
  console.log("orderBits", { bitStream, errorCorrectionLevel, version });
  let blocks = createBlocks(bitStream, errorCorrectionLevel, version);
  //blocks.forEach((block) => block.generateErrorCorrection());
  console.log("orderBits", { blocks });
  const totalCodewords = blocks.reduce((t, b) => t + b.totalCodewords, 0);
  console.log("orderBits", { totalCodewords });

  let orderedBits = [];
  for (let i = 0; i < totalCodewords; i++) {
    const blockIdx = i % blocks.length;
    const cwIdx = Math.floor(i / blocks.length);
    console.log("orderBits", { i, blockIdx, cwIdx });
    let block = blocks[blockIdx];
    const { bits } = block.codewords[cwIdx];
    orderedBits.push(...bits);
  }
  return orderedBits;
};

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

const generateMatrix = (bitStream, errorCorrectionLevel, version, dataMask) => {
  const orderedBits = orderBits(bitStream, errorCorrectionLevel, version);
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
          if (bitIdx < orderedBits.length) {
            taggedBit = orderedBits[bitIdx++];
            if (taggedBit instanceof ECBit) {
              // no idea what this intends to do...
              this;
            }
          } else {
            taggedBit = REMAINDER_BIT;
          }

          const { source, altered, value } = taggedBit;
          const isMasked = DATA_MASKS[dataMask]({ x, y });
          matrix[y][x] = {
            bit: taggedBit,
            segment: source,
            x,
            y,
            isMasked,
            isHighlighted: altered ? true : false,
            isDark: isMasked ? !value : value,
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
  let matrix;
  let moduleSize = 0;

  if (bitStream) {
    if (version === "auto") {
      version = getMinimumQRCodeVersion(bitStream.size(), errorCorrectionLevel);
    }

    if (dataMask === "auto") {
      // ignore for now
      dataMask = 1;
    }

    matrix = generateMatrix(bitStream, errorCorrectionLevel, version, dataMask);
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
          ctx.fillStyle = module.isDark ? "black" : "white";
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
      if (event.type === "click") {
        module.highlight();
      } else if (event.type === "contextmenu") {
        module.toggleBit();
        onBitToggle(module);
      }
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
