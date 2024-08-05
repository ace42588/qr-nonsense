import React, { useState } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay";
import ModeSelector from "./components/ModeSelector";
import InputForm from "./components/InputForm";
import VideoScanner from "./components/VideoScanner";
import { Block } from "./encode/Block";
import { getEncoder } from "./encode/Encoder";
import { TaggedBitstream } from "./encode/TaggedBitstream";
import { VERSIONS } from "./encode/version";
import { QRCodeMatrix } from "./qrCodeMatrix";

const segments = [];
const blocks = [];

let bitStream;
let errorCorrectionLevel;

function App() {
  const [mode, setMode] = useState("scan"); // Default to scan mode
  const [segments, setSegments] = useState([]);
  const [matrix, setMatrix] = useState([]);

  const handleQRCodeScanned = (code) => {
    // Handle the scanned QR code data
    processQRCodeData(code.chunks, code.version, code.formatInfo);
  };

  const handleInputSubmit = (inputData, inputMode) => {
    // Encode data into QR code
    const chunks = [{ type: inputMode.toLowerCase(), text: inputData }]; // Example structure
    processQRCodeData(chunks, 1, { errorCorrectionLevel: 1 }); // Example parameters
  };

  const processQRCodeData = (chunks, version, formatInfo) => {
    const versionInfo = VERSIONS[version <= 6 ? version - 1 : version];

    errorCorrectionLevel = formatInfo.errorCorrectionLevel;
  bitStream = new TaggedBitstream();
  for (const chunk of chunks) {
    const { type, text, bytes, assignmentNumber } = chunk;
    const data = text ? text : bytes ? bytes : assignmentNumber;
    getEncoder({ type, bitStream }).encode(data);
  }
  blocks = createBlocks(bitStream, errorCorrectionLevel, versionInfo);

    const newSegments = bitStream.segments;
    setSegments(newSegments);

    const qrMatrix = new QRCodeMatrix({ versionInfo, formatInfo });
    qrMatrix.placeFunctionPatterns();
    qrMatrix.placeCodewords(qrGenerator.codewords);

    setMatrix(qrMatrix.matrix); // Set the matrix state
  };

  const handleBitToggle = (module) => {
    const segment = module.bit.source;
    segment.updateValue();
    setSegments([...segments]);
  };

  return (
    <div className="App">
      <h1>QR Code Generator</h1>
      <ModeSelector mode={mode} setMode={setMode} />
      {mode === "manual" ? (
        <InputForm onSubmit={handleInputSubmit} />
      ) : (
        <VideoScanner onQRCodeScanned={handleQRCodeScanned} />
      )}
      <QRCodeCanvas matrix={matrix} onBitToggle={handleBitToggle} />
      <SegmentDisplay segments={segments} />
    </div>
  );
}

export default App;

// Utility function to generate matrix
function generateMatrixFromCodewords(codewords, versionInfo) {
  const qrMatrix = new QRCodeMatrix({ versionInfo });
  qrMatrix.placeCodewords(codewords);
  return qrMatrix.getMatrix();
}

function qrCodeGenerator({ chunks, formatInfo, versionInfo }) {
  //console.log("QRCodeGenerator", { chunks, errorCorrectionLevel, version });
  errorCorrectionLevel = formatInfo.errorCorrectionLevel;
  bitStream = new TaggedBitstream();
  for (const chunk of chunks) {
    const { type, text, bytes, assignmentNumber } = chunk;
    const data = text ? text : bytes ? bytes : assignmentNumber;
    getEncoder({ type, bitStream }).encode(data);
  }
  blocks = createBlocks(bitStream, errorCorrectionLevel, versionInfo);
}

function generateErrorCorrection(blocks) {
  for (const block of blocks) {
    block.generateErrorCorrection();
  }
}

function getCodewords(blocks) {
  generateErrorCorrection(blocks);
  let cw = [];
  let totalCodewords = blocks.reduce(
    (total, block) => total + block.totalCodewords,
    0
  );
  for (let i = 0; i < totalCodewords; i++) {
    const blockIdx = i % blocks.length;
    const cwIdx = Math.floor(i / blocks.length);
    let block = blocks[blockIdx];
    let codeword = block.codewords[cwIdx];
    cw.push(codeword);
  }
  return cw;
}

function createBlocks(bitStream, errorCorrectionLevel, version) {
  console.log("createBlocks", { bitStream, errorCorrectionLevel, version });
  const { errorCorrectionLevels } = version;
  const { ecCodewordsPerBlock, ecBlocks } =
    errorCorrectionLevels[errorCorrectionLevel];

  let blocks = [];
  let requiredDataCodewords = 0;

  ecBlocks.forEach((group) => {
    const { numBlocks, dataCodewordsPerBlock } = group;
    requiredDataCodewords += numBlocks * dataCodewordsPerBlock;
    for (let i = 0; i < numBlocks; i++) {
      const block = new Block(dataCodewordsPerBlock, ecCodewordsPerBlock, i);
      blocks.push(block);
    }
  });

  // Complete bytes and add padding
  bitStream.finalize(requiredDataCodewords);
  // fill blocks with codewords
  for (const block of blocks) {
    const { dataCodewords, numDataCodewords } = block;
    while (dataCodewords.length < numDataCodewords) {
      const taggedBits = bitStream.readTaggedByte();
      const codeword = new TaggedCodeword(taggedBits, dataCodewords.length);
      dataCodewords.push(codeword);
    }
  }

  //console.log({ blocks });
  return blocks;
}
