import React, { useState } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay";
import ModeSelector from "./components/ModeSelector";
import InputForm from "./components/InputForm";
import VideoScanner from "./components/VideoScanner";
import { createBlocks } from "./encode/Block";
import { getEncoder } from "./encode/Encoder";
import { TaggedBitstream } from "./encode/TaggedBitstream";
import { VERSIONS } from "./encode/version";
import { QRCodeMatrix } from "./QRCodeMatrix";

const segments = [];
let bitStream;
let errorCorrectionLevel;

function App() {
  const [mode, setMode] = useState("scan"); // Default to scan mode
const [inputs, setInputs] = useState([{ type: 'byte', value: '' }]); // Include default mode
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
    processQRCodeData(
      inputs.map((input) => ({ type: "byte", text: input.value })),
      1,
      { errorCorrectionLevel: 1 }
    );
  };

  const handleQRCodeScanned = (code) => {
    // Handle the scanned QR code data
    processQRCodeData(code.chunks, code.version, code.formatInfo);
  };

  const processQRCodeData = (chunks, version, formatInfo) => {
    let codewords = [];
    const versionInfo = VERSIONS[version <= 6 ? version - 1 : version];
    const { errorCorrectionLevels } = versionInfo;

    errorCorrectionLevel = formatInfo.errorCorrectionLevel;
    const { ecCodewordsPerBlock, ecBlocks } =
      errorCorrectionLevels[errorCorrectionLevel];
    bitStream = new TaggedBitstream();
    for (const chunk of chunks) {
      const { type, text, bytes, assignmentNumber } = chunk;
      const data = text ? text : bytes ? bytes : assignmentNumber;
      getEncoder({ type, bitStream }).encode(data);
    }

    setSegments(bitStream.segments);
    const blocks = createBlocks(bitStream, errorCorrectionLevel, versionInfo);
    for (const block of blocks) {
      block.generateErrorCorrection();
    }

    const qrMatrix = new QRCodeMatrix({ versionInfo, formatInfo });
    qrMatrix.placeFunctionPatterns();

    let totalCodewords = blocks.reduce(
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

    qrMatrix.placeCodewords(codewords);

    setMatrix(qrMatrix.matrix); // Set the matrix state
  };

  const handleSegmentClick = (segment, index) => {
    // Handle the logic when a segment is clicked
    console.log({ segment, index });
  };

  const handleBitToggle = (module) => {
    const segment = module.bit.source;
    //segment.updateValue();
    setSegments([...segments]);
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
        <VideoScanner onQRCodeScanned={handleQRCodeScanned} />
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
