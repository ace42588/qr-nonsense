import React, { useRef, useEffect } from "react";
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

export class QRModule {
  constructor({ taggedBit, x, y, maskNum }) {
    this.bit = taggedBit;
    this.segment = this.bit.source;
    this.x = x;
    this.y = y;
    this.setMask(maskNum);
    this.highlighted = false;
  }

  setMask(maskNum) {
    this.maskFunction = DATA_MASKS[maskNum];
  }

  isMasked() {
    this.maskFunction({ x: this.x, y: this.y });
  }

  isDark() {
    return this.isMasked ? !this.bit.value : this.bit.value;
  }

  isHighlighted() {
    return this.highlighted;
  }

  highlight() {
    this.highlighted = !this.highlighted;
  }

  toggleBit() {
    this.bit.toggle();
  }
}

export class ModuleFactory {
  constructor(dataMask, bits) {
    this.dataMask = dataMask || 0;
    this.bits = bits || [];
    this.bitIdx = 0;
  }

  setDataMask(mask) {
    if (-1 < mask < 8) this.dataMask = mask;
  }

  setBitSource(bits) {
    this.bitIdx = 0;
    this.bits = bits;
  }

  getDataModule({ x, y }) {
    let taggedBit;
    if (this.bitIdx < this.bits.length) {
      taggedBit = this.bits[this.bitIdx++];
      if (taggedBit instanceof ECBit) {
        this;
      }
    } else {
      taggedBit = REMAINDER_BIT;
    }
    const module = new QRModule({
      taggedBit,
      x,
      y,
      masked: DATA_MASKS[this.dataMask]({ x, y }),
    });
    if (taggedBit.altered) module.highlight();

    return module;
  }
}

function QRCodeCanvas({
  bitStream,
  setBitStream,
  setSegments,
  errorCorrectionLevel,
  version,
}) {
  const canvasRef = useRef(null);

  let blocks;
  const processQRCodeData = ({ chunks, version, formatInfo }) => {
    console.log({ chunks, version, formatInfo });

    if (version === "auto") {
      version = getMinimumQRCodeVersion(bitStream.size(), errorCorrectionLevel);
      console.log({ version });
    }
    const versionDetails = VERSIONS[version - 1];
    console.log({ versionDetails });

    setSegments(bitStream.segments);

    blocks = createBlocks(bitStream, errorCorrectionLevel, versionDetails);
    for (const block of blocks) {
      block.generateErrorCorrection();
    }

    const totalCodewords = blocks.reduce(
      (total, block) => total + block.totalCodewords,
      0
    );

    if (!formatInfo.errorCorrectionLevel)
      formatInfo.errorCorrectionLevel = errorCorrectionLevel;

    new QRCodeMatrix({ versionDetails, formatInfo });
    for (let i = 0; i < totalCodewords; i++) {
      const blockIdx = i % blocks.length;
      const cwIdx = Math.floor(i / blocks.length);
      let block = blocks[blockIdx];
      let codeword = block.codewords[cwIdx];
      matrix.push(codeword);
    }

    matrix.placeCodewords();
  };

  const handleBitToggle = (module) => {
    let codewords = [];

    setSegments(bitStream.segments);

    blocks = createBlocks(bitStream, errorCorrectionLevel, versionDetails);
    for (const block of blocks) {
      block.generateErrorCorrection();
    }

    const totalCodewords = blocks.reduce(
      (total, block) => total + block.totalCodewords,
      0
    );

    for (let i = 0; i < totalCodewords; i++) {
      const blockIdx = i % blocks.length;
      const cwIdx = Math.floor(i / blocks.length);
      let block = blocks[blockIdx];
      let codeword = block.codewords[cwIdx];
      codewords.push(codeword);
    }

    qrMatrix.reset();
    qrMatrix.placeFunctionPatterns();
    qrMatrix.setData(codewords);
    qrMatrix.placeCodewords();

    setMatrix(qrMatrix.matrix);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const moduleSize = canvas.width / matrix.length;

    // Draw the QR code on the canvas
    drawQRCodeMatrix(ctx, matrix, moduleSize);
  }, [matrix]);

  const drawQRCodeMatrix = (ctx, matrix, moduleSize) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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
  };

  const handleClick = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const moduleSize = canvas.width / matrix.length;
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
