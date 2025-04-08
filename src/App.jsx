import React, { useState } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay/SegmentDisplay";
import ModeSelector from "./components/ModeSelector/ModeSelector";
import InputForm from "./components/InputForm/InputForm";
import VideoScanner from "./components/VideoScanner/VideoScanner";
import { createBlocks } from "./encode/Block";
import { getEncoder } from "./encode/Encoder";
import { TaggedBitstream } from "./encode/TaggedBitstream";
import { VERSIONS } from "./encode/version";
import { QRCodeMatrix } from "./QRCodeMatrix";
//import './App.css';

let versionDetails;
let errorCorrectionLevels;
let errorCorrectionLevel;

const segments = [];
let bitStream;
let blocks;
let qrMatrix;
let totalCodewords;

function App() {
  const [mode, setMode] = useState("scan"); // Default to scan mode
  const [inputs, setInputs] = useState([{ type: "byte", value: "" }]); // Include default mode
  const [segments, setSegments] = useState([]);
  const [matrix, setMatrix] = useState([]);

  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].value = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, newMode) => {
    const newInputs = [...inputs];
    newInputs[index].type = newMode;
    setInputs(newInputs);
  };

  const handleAddInput = () => {
    setInputs([...inputs, { type: "text", value: "" }]);
  };

  const handleRemoveInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    setInputs(newInputs);
  };

  const handleInputSubmit = (event) => {
    event.preventDefault();
    const chunks = inputs.map((input) => ({ type: "byte", text: input.value }));
    const version = 1;
    const formatInfo = { errorCorrectionLevel: 1 };
    processQRCodeData({ chunks, version, formatInfo });
  };

  const processQRCodeData = ({ chunks, version, formatInfo }) => {
    console.log({ chunks, version, formatInfo });
    let codewords = [];
    versionDetails = VERSIONS[version - 1];
    errorCorrectionLevels = versionDetails.errorCorrectionLevels;
    errorCorrectionLevel = formatInfo.errorCorrectionLevel;

    bitStream = new TaggedBitstream();

    for (const chunk of chunks) {
      const { type, text, bytes, assignmentNumber } = chunk;
      const data = text ? text : bytes ? bytes : assignmentNumber;
      getEncoder({ type, bitStream }).encode(data);
    }

    setSegments(bitStream.segments);

    blocks = createBlocks(bitStream, errorCorrectionLevel, versionDetails);
    for (const block of blocks) {
      block.generateErrorCorrection();
    }

    totalCodewords = blocks.reduce(
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

    qrMatrix = new QRCodeMatrix({ versionDetails, formatInfo });
    qrMatrix.placeFunctionPatterns();
    qrMatrix.placeCodewords(codewords);

    setMatrix(qrMatrix.matrix); // Set the matrix state
  };

  const handleSegmentClick = (segment) => {
    const newMatrix = matrix.map((row) =>
      row.map((module) => {
        if (module.segment === segment) {
          module.highlight();
        }
        return module;
      })
    );
    setMatrix(newMatrix); // Update the matrix state to trigger a re-render
  };

  const handleBitToggle = (module) => {
    let codewords = [];

    setSegments(bitStream.segments);

    blocks = createBlocks(bitStream, errorCorrectionLevel, versionDetails);
    for (const block of blocks) {
      block.generateErrorCorrection();
    }

    for (let i = 0; i < totalCodewords; i++) {
      const blockIdx = i % blocks.length;
      const cwIdx = Math.floor(i / blocks.length);
      let block = blocks[blockIdx];
      let codeword = block.codewords[cwIdx];
      codewords.push(codeword);
    }

    qrMatrix.reset();
    qrMatrix.placeFunctionPatterns();
    qrMatrix.placeCodewords(codewords);

    setMatrix(qrMatrix.matrix);
  };

  return (
    <div className="App">
      <h1>QR Code Generator</h1>
      <ModeSelector mode={mode} setMode={setMode} />
      {mode === "manual" ? (
        <InputForm
          inputs={inputs}
          onInputChange={handleInputChange}
          onModeChange={handleModeChange}
          onAddInput={handleAddInput}
          onRemoveInput={handleRemoveInput}
          onSubmit={handleInputSubmit}
        />
      ) : (
        <VideoScanner onQRCodeScanned={processQRCodeData} />
      )}
      <QRCodeCanvas matrix={matrix} onBitToggle={handleBitToggle} />
      <SegmentDisplay segments={segments} onSegmentClick={handleSegmentClick} />
    </div>
  );
}

export default App;

function getCodewords(blocks) {
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
