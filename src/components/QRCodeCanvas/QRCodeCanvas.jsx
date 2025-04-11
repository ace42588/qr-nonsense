import React, { useRef, useEffect, useState } from "react";
import "./QRCodeCanvas.css";

import { FormatInfo } from "../../encode/FormatInfo";
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


function getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
  const qrCapacityBytes = [
    {
      1: 17,
      2: 32,
      3: 53,
      4: 78,
      5: 106,
      6: 134,
      7: 154,
      8: 192,
      9: 230,
      10: 271,
      11: 321,
      12: 367,
      13: 425,
      14: 458,
      15: 520,
      16: 586,
      17: 644,
      18: 718,
      19: 792,
      20: 858,
      21: 929,
      22: 1003,
      23: 1091,
      24: 1171,
      25: 1273,
      26: 1367,
      27: 1465,
      28: 1528,
      29: 1628,
      30: 1732,
      31: 1840,
      32: 1952,
      33: 2068,
      34: 2188,
      35: 2303,
      36: 2431,
      37: 2563,
      38: 2699,
      39: 2809,
      40: 2953,
    },
    {
      1: 14,
      2: 26,
      3: 42,
      4: 62,
      5: 84,
      6: 106,
      7: 122,
      8: 152,
      9: 180,
      10: 213,
      11: 251,
      12: 287,
      13: 331,
      14: 362,
      15: 412,
      16: 450,
      17: 504,
      18: 560,
      19: 624,
      20: 666,
      21: 711,
      22: 779,
      23: 857,
      24: 911,
      25: 997,
      26: 1059,
      27: 1125,
      28: 1190,
      29: 1264,
      30: 1370,
      31: 1452,
      32: 1538,
      33: 1628,
      34: 1722,
      35: 1809,
      36: 1911,
      37: 1989,
      38: 2099,
      39: 2213,
      40: 2331,
    },
    {
      1: 11,
      2: 20,
      3: 32,
      4: 46,
      5: 60,
      6: 74,
      7: 86,
      8: 108,
      9: 130,
      10: 151,
      11: 177,
      12: 203,
      13: 241,
      14: 258,
      15: 292,
      16: 322,
      17: 364,
      18: 394,
      19: 442,
      20: 482,
      21: 509,
      22: 565,
      23: 611,
      24: 661,
      25: 715,
      26: 751,
      27: 805,
      28: 868,
      29: 908,
      30: 982,
      31: 1030,
      32: 1112,
      33: 1168,
      34: 1228,
      35: 1283,
      36: 1351,
      37: 1423,
      38: 1499,
      39: 1579,
      40: 1663,
    },
    {
      1: 7,
      2: 14,
      3: 24,
      4: 34,
      5: 44,
      6: 58,
      7: 64,
      8: 84,
      9: 98,
      10: 119,
      11: 137,
      12: 155,
      13: 177,
      14: 194,
      15: 220,
      16: 250,
      17: 280,
      18: 310,
      19: 338,
      20: 382,
      21: 403,
      22: 439,
      23: 461,
      24: 511,
      25: 535,
      26: 593,
      27: 625,
      28: 658,
      29: 698,
      30: 742,
      31: 790,
      32: 842,
      33: 898,
      34: 958,
      35: 983,
      36: 1051,
      37: 1093,
      38: 1139,
      39: 1219,
      40: 1273,
    },
  ];

  // Ensure error correction level is in uppercase.
  errorCorrectionLevel = errorCorrectionLevel.toUpperCase();
  if (!qrCapacityBytes[errorCorrectionLevel]) {
    throw new Error("Invalid error correction level: " + errorCorrectionLevel);
  }

  // Try each version until one is found that fits the data.
  for (let version = 1; version <= 40; version++) {
    let capacityBytes = qrCapacityBytes[errorCorrectionLevel][version];
    let capacityBits = capacityBytes * 8;

    // A terminator of up to 4 bits can be added.
    const terminatorBits = Math.min(
      4,
      Math.max(0, capacityBits - totalDataBits)
    );
    const totalBitsWithTerminator = totalDataBits + terminatorBits;

    // The total bits must be rounded up to the next whole 8-bit codeword.
    const requiredBytes = Math.ceil(totalBitsWithTerminator / 8);

    if (requiredBytes <= capacityBytes) {
      return version;
    }
  }
  throw new Error("Data too large to fit in a QR code version 40.");
}

function QRCodeCanvas({
  bitStream,
  setBitStream,
  setSegments,
  errorCorrectionLevel,
  version,
  dataMask,
}) {
  const canvasRef = useRef(null);
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  const { dataBits } = bitStream;
  let bitIdx = 0;

  if (version === "auto") {
    version = getMinimumQRCodeVersion(bitStream.size(), errorCorrectionLevel);
    console.log({ version });
  }
  const versionDetails = VERSIONS[version - 1];
  const alignmentPattern = new AlignmentPattern(versionDetails.versionNumber);
  const versionInfo = new VersionInfo(versionDetails);
  const { numModules } = versionInfo;
  const matrix = Array.from({ length: numModules }, () =>
    Array(numModules).fill(false)
  );
  const dimension = matrix.length;
  const moduleSize = canvas.width / dimension;

  if (dataMask === "auto") {
    // ignore for now
    dataMask = 1;
  }
  const formatInfo = new FormatInfo({ errorCorrectionLevel, dataMask });

  let blocks = createBlocks(bitStream, errorCorrectionLevel, versionDetails);
  const totalCodewords = blocks.reduce((t, b) => t + b.totalCodewords, 0);
  let codewords = [];
  for (let i = 0; i < totalCodewords; i++) {
    const blockIdx = i % blocks.length;
    const cwIdx = Math.floor(i / blocks.length);
    let block = blocks[i % blocks.length];
    let codeword = block.codewords[Math.floor(i / blocks.length)];
    codewords.push(codeword);
  }

  const getDataModule = ({ x, y }) => {
    const maskFunction = DATA_MASKS[dataMask];
    let taggedBit;
    if (bitIdx < dataBits.length) {
      taggedBit = dataBits[bitIdx++];
      if (taggedBit instanceof ECBit) {
        // no idea what this intends to do...
        this;
      }
    } else {
      taggedBit = REMAINDER_BIT;
    }

    const { source, altered, value } = taggedBit;
    const isMasked = DATA_MASKS[dataMask]({ x, y });

    return {
      bit: taggedBit,
      segment: source,
      x,
      y,
      isMasked,
      isHighlighted: altered ? true : false,
      isDark: isMasked ? !value : value,
    };
  };

  useEffect(() => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    FinderPattern.populate(matrix);
    TimingPattern.populate(matrix);
    alignmentPattern.populate(matrix);
    formatInfo.populate(matrix);
    versionInfo.populate(matrix);

    let up = true;
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
            matrix[y][x] = getDataModule({ x, y });
          }
        }
      }
      up = !up; // Change direction
    }

    // Draw the QR code on the canvas

    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        const module = matrix[y][x];
        ctx.fillStyle = module.isDark() ? "black" : "white";
        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);

        // Draw a border if highlighted
        if (module && module.isHighlighted()) {
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
