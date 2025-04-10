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

function App() {
  const [mode, setMode] = useState("merch"); // Default to merch mode
  const [segments, setSegments] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [bitStream, setBitStream] = useState(new TaggedBitstream());
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState([]);

  let qrMatrix;
  let blocks;
  let versionDetails;

  const processQRCodeData = ({ chunks, version, formatInfo }) => {
    console.log({ chunks, version, formatInfo });
    setBitStream(new TaggedBitstream());
    versionDetails = VERSIONS[version - 1];
    setErrorCorrectionLevel(formatInfo.errorCorrectionLevel);

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

    const totalCodewords = blocks.reduce(
      (total, block) => total + block.totalCodewords,
      0
    );

    setMatrix(new QRCodeMatrix({ versionDetails, formatInfo }));
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

  const selectUI = () => {
    if (mode === "merch") {
      return (
        <MerchForm
          setECLevel={setErrorCorrectionLevel}
          onSubmit={processQRCodeData}
        />
      );
    } else if (mode === "scan") {
      return (
        <VideoScanner
          setECLevel={setErrorCorrectionLevel}
          onQRCodeScanned={processQRCodeData}
        />
      );
    }
    return (
      <InputForm
        setECLevel={setErrorCorrectionLevel}
        onSubmit={processQRCodeData}
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
