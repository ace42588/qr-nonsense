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

/**
 * Given an array of data chunks and an error correction level,
 * returns the smallest QR code version (1 to 40) that can hold the data.
 *
 * Each chunk may be in a different mode and must supply data using a property such as:
 *
 *   - For numeric or alphanumeric modes: use a "text" property containing the characters.
 *   - For byte mode:
 *       • If using a hexadecimal string, include an "encoding" property set to "hex" and a "bytes" property.
 *       • If using UTF‑8 text, include an "encoding" property like "utf-8" (or "utf8") and a "text" property.
 *   - For kanji mode: provide the string (via "text") that is assumed to contain only double-byte Kanji.
 *
 * You may also explicitly specify the mode in each chunk by using a "mode" property.
 *
 * @param {Array<Object>} chunks - Array of data chunks.
 * @param {string} errorCorrectionLevel - One of "L", "M", "Q", or "H".
 * @returns {number} The smallest QR code version (1–40) that fits the data.
 * @throws {Error} if data is too large for a version 40 code.
 */
function getMinimumQRCodeVersion(totalDataBits, errorCorrectionLevel) {
  const ErrorCorrectionLevel = ["M", "L", "H", "Q"];
  const qrCapacityBytes = {
    L: {
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
    M: {
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
    Q: {
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
    H: {
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
  };

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

function App() {
  const [mode, setMode] = useState("merch"); // Default to merch mode
  const [segments, setSegments] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [bitStream, setBitStream] = useState(new TaggedBitstream());
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState("M");
  const [versionDetails, setVersionDetails] = useState();

  let qrMatrix;
  let blocks;

  const processQRCodeData = ({ chunks, version, formatInfo }) => {
    console.log({ chunks, version, formatInfo });
    setBitStream(new TaggedBitstream());

    chunks.forEach(({ type, encoding, ...data }) =>
      getEncoder({ type, bitStream }).encode(data, encoding)
    );

    if (version === "auto") {
      version = getMinimumQRCodeVersion(bitStream.size(), errorCorrectionLevel);
    }
    setVersionDetails(VERSIONS[version - 1]);

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
          errorCorrectionLevel={errorCorrectionLevel}
          onSubmit={processQRCodeData}
        />
      );
    } else if (mode === "scan") {
      return <VideoScanner onQRCodeScanned={processQRCodeData} />;
    }
    return (
      <InputForm
        errorCorrectionLevel={errorCorrectionLevel}
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
