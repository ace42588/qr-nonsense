import React, { useRef, useEffect } from "react";
import "./QRCodeCanvas.css";
import { VERSIONS } from "../../encode/version";

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
    setBitStream(new TaggedBitstream());

    chunks.forEach(({ type, encoding, ...data }) =>
      getEncoder({ type, bitStream }).encode(Object.values(data)[0], encoding)
    );
    console.log({ bitStream });

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

    setMatrix(new QRCodeMatrix({ versionDetails, formatInfo }));
    console.log({ matrix });
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
