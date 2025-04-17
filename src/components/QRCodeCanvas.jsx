import React, { useRef, useEffect, useState } from "react";
import "./styles.css";

import { FormatInfo } from "../encode/FormatInfo";
import {
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
} from "../encode/FunctionPatterns";
import { VersionInfo } from "../encode/VersionInfo";
import { RemainderBit, ECBit } from "../encode/TaggedBitstream";

import { useQRData, useQRDataDispatch } from "../context/QRDataContext";
import { QRUtils, generateQRCodeMatrix } from "../utils/QRUtils";

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

export default function QRCodeCanvas() {
  const canvasRef = useRef(null);
  const { errorCorrectionLevel, calculatedVersion: version, dataMask, codewords } = useQRData();

  const [matrix, setMatrix] = useState(null);
  
  useEffect(() => {
    if (!version || !codewords) return;

    const { matrix: generatedMatrix } = generateQRCodeMatrix({
      version,
      errorCorrectionLevel,
      dataMask,
      codewords,
    });

    setMatrix(generatedMatrix);
  }, [version, errorCorrectionLevel, dataMask, codewords]);
  
    useEffect(() => {
    if (!canvasRef.current || !matrix) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dimension = matrix.length;
    const moduleSize = canvas.width / dimension;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const m = matrix[y][x];
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

    const dimension = matrix.length;
    const moduleSize = canvas.width / dimension;
    const xIndex = Math.floor(x / moduleSize);
    const yIndex = Math.floor(y / moduleSize);

    const module = matrix[yIndex]?.[xIndex];
    if (!module) return;

    if (event.type === "click") {
      console.log(module);
    } else if (event.type === "contextmenu") {
      // Toggle value and update source
      const updated = matrix.map((row, y) =>
        row.map((cell, x) => {
          if (x === xIndex && y === yIndex && cell) {
            const newValue = !cell.value;
            return {
              ...cell,
              value: newValue,
              source: {
                ...cell.source,
                modified: true,
                overrideValue: newValue,
              },
            };
          }
          return cell;
        })
      );
      setMatrix(updated);
    }
  };

  //console.debug("QRCodeCanvas", { errorCorrectionLevel, version, dataMask });
  /*
  if (dataMask === -1) {
    // ignore for now
    dataMask = 0;
  }

  function createEmptyMatrix() {
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
  }

  function addModules(empty) {
    //console.log("addModulesToMatrix");
    const newMatrix = empty.map((row) => [...row]);
    const bits = codewords.flat();
    let bitIdx = 0;
    let up = true;
    const dimension = newMatrix.length;
    // write columns in pairs, right to left
    for (let columnIdx = dimension - 1; columnIdx > 0; columnIdx -= 2) {
      // Skip the vertical timing pattern column
      if (columnIdx === 6) columnIdx--;

      for (let i = 0; i < dimension; i++) {
        const y = up ? dimension - 1 - i : i;

        for (let columnOffset = 0; columnOffset < 2; columnOffset++) {
          let x = columnIdx - columnOffset;

          // check for pattern
          if (!newMatrix[y][x]) {
            //console.debug({bits, bitIdx});
            let taggedBit;
            if (bitIdx < bits.length) {
              taggedBit = bits[bitIdx++];
            } else {
              taggedBit = REMAINDER_BIT;
            }

            const isMasked = DATA_MASKS[dataMask]({ x, y });
            newMatrix[y][x] = {
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
    return newMatrix;
  }

  const empty = createEmptyMatrix();
  const matrix = addModules(empty);
*/

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
