import React, { useState } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay/SegmentDisplay";
import ModeSelector from "./components/ModeSelector/ModeSelector";
import InputForm from "./components/InputForm/InputForm";
import MerchForm from "./components/MerchForm/MerchForm";
import VideoScanner from "./components/VideoScanner/VideoScanner";
import { createBlocks } from "./encode/Block";
import { getEncoder } from "./encode/Encoder";
import { TaggedBitstream } from "./encode/TaggedBitstream";
import { VERSIONS } from "./encode/version";
import { QRCodeMatrix } from "./QRCodeMatrix";
import "./App.css";

let versionDetails;
//let errorCorrectionLevels;
let errorCorrectionLevel;

const segments = [];
let bitStream;
let blocks;
let qrMatrix;
let totalCodewords;

function App() {
  const [mode, setMode] = useState("merch"); // Default to merch mode
  const [inputs, setInputs] = useState([{ type: "byte", value: "" }]); // Include default mode
  const [segments, setSegments] = useState([]);
  const [matrix, setMatrix] = useState([]);

  const processQRCodeData = ({ chunks, version, formatInfo }) => {
    console.log({ chunks, version, formatInfo });
    let codewords = [];
    versionDetails = VERSIONS[version - 1];
    //errorCorrectionLevels = versionDetails.errorCorrectionLevels;
    errorCorrectionLevel = formatInfo.errorCorrectionLevel;

    bitStream = new TaggedBitstream();

    for (const chunk of chunks) {
      const { type, text, bytes, assignmentNumber, encoding } = chunk;
      const data = text ? text : bytes ? bytes : assignmentNumber;
      getEncoder({ type, bitStream }).encode(data, encoding);
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
    console.log({ codewords });
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

  const selectUI = () => {
    if (mode === "merch") {
      return (
        <MerchForm
          inputs={inputs}
          setInputs={setInputs}
          processQRCodeData={processQRCodeData}
        />
      );
    } else if (mode === "scan") {
      return <VideoScanner onQRCodeScanned={processQRCodeData} />;
    }
    return (
      <InputForm
        inputs={inputs}
        setInputs={setInputs}
        processQRCodeData={processQRCodeData}
      />
    );
  };

  return (
    <div className="App">
      <div className="row">
        <h1>QR Code Generator</h1>
      </div>
      <div className="row">
        <div className="column">
          <ModeSelector mode={mode} setMode={setMode} />
          {selectUI()}
        </div>
        <div className="column">
          <QRCodeCanvas matrix={matrix} onBitToggle={handleBitToggle} />
        </div>
      </div>
      <div className="row">
        <SegmentDisplay
          segments={segments}
          matrix={matrix}
          setMatrix={setMatrix}
        />
      </div>
    </div>
  );
}

export default App;
