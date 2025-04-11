import React, { useState } from "react";
import QRCodeCanvas from "./components/QRCodeCanvas/QRCodeCanvas";
import SegmentDisplay from "./components/SegmentDisplay/SegmentDisplay";
import ModeSelector from "./components/ModeSelector/ModeSelector";
import InputForm from "./components/InputForm/InputForm";
import MerchForm from "./components/MerchForm/MerchForm";
import VideoScanner from "./components/VideoScanner/VideoScanner";
import ErrorCorrectionSelector from "./components/ECSelector/ECSelector";
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
  const [version, setVersion] = useState("auto");
  const [dataMask, setDataMask] = useState("auto");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("1");

  let qrMatrix;
  let blocks;

  const processQRCodeData = ({ chunks, version, formatInfo }) => {
    console.log({ chunks, version, formatInfo });
    setBitStream(new TaggedBitstream());

    chunks.forEach(({ type, encoding, ...data }) =>
      getEncoder({ type, bitStream }).encode(Object.values(data)[0], encoding)
    );
    console.log({ bitStream });

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

  const selectUI = () => {
    if (mode === "merch") {
      return (
        <MerchForm
          errorCorrectionLevel={errorCorrectionLevel}
          onSubmit={processQRCodeData}
          version={version}
          setVersion={setVersion}
          dataMask={dataMask}
          setDataMask={setDataMask}
        />
      );
    } else if (mode === "scan") {
      return <VideoScanner onQRCodeScanned={processQRCodeData} />;
    }
    return (
      <InputForm
        errorCorrectionLevel={errorCorrectionLevel}
        onSubmit={processQRCodeData}
        version={version}
        setVersion={setVersion}
        dataMask={dataMask}
        setDataMask={setDataMask}
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
          <div className="row">
            <ModeSelector mode={mode} setMode={setMode} />
          </div>
          <div className="row">
            <ErrorCorrectionSelector
              value={errorCorrectionLevel}
              onChange={setErrorCorrectionLevel}
            />
          </div>
          <div className="row">{selectUI()}</div>
        </div>
        <div className="column">
          <QRCodeCanvas
            bitstream={bitStream}
            setBitStream={setBitStream}
            errorCorrectionLevel={errorCorrectionLevel}
            version={version}
            dataMask={dataMask}
          />
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
