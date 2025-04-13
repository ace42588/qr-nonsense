import React, { useState, useContext } from "react";
import "./styles.css"; // Import your component-specific styles

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./Selectors";
import { QRDataDispatchContext } from "../context/QRDataContext";

import { getEncoder } from "../encode/Encoder";
import { TaggedBitstream } from "../encode/TaggedBitstream";

const modes = ["JSON", "alphanumeric", "PER"]; // Available modes

export default function MerchForm({
  setBitStream,
  version,
  setVersion,
  dataMask,
  setDataMask,
  errorCorrectionLevel,
  setErrorCorrectionLevel,
}) {
  const [input, setInput] = useState({ type: "JSON", value: sampleInput });
  const dispatch = useContext(QRDataDispatchContext);

  const handleChangeInput = (e) => {
    const newInput = { ...input, value: e.target.value };
    setInput(newInput);
  };

  const handleChangeEncoding = (e) => {
    const newEncoding = e.target.value;
    const newInput = { ...input, type: newEncoding };

    if (newEncoding === "byte") {
      newInput.encoding = "utf-8";
    } else {
      delete newInput.encoding;
    }
    setInput(newInput);
  };

  const handleInputSubmit = (event) => {
    event.preventDefault();
    const chunks = parseInput(input);
    const bitStream = new TaggedBitstream();
    chunks.forEach(({ type, encoding, ...data }) =>
      getEncoder({ type, bitStream }).encode(Object.values(data)[0], encoding)
    );

    setBitStream(bitStream);
  };

  return (
    <form onSubmit={handleInputSubmit} className="input-form">
      <div className="row">
        <ErrorCorrectionSelector
          value={errorCorrectionLevel}
          onChange={setErrorCorrectionLevel}
        />
      </div>
      <div className="row">
        <VersionSelector value={version} onChange={setVersion} />
      </div>
      <div className="row">
        <DataMaskSelector value={dataMask} onChange={setDataMask} />
      </div>
      <div className="row">
        <div key={0} className="input-group">
          <label htmlFor="encoding">Encoding:</label>
          <select
            id="encoding"
            value={input.type}
            onChange={(e) => handleChangeEncoding(e.target.value)}
          >
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
          {}
          <textarea
            type="text"
            rows={16}
            value={input.value}
            onChange={(e) => handleChangeInput(e)}
          />
        </div>
      </div>
      <div className="row">
        <button type="submit">Generate QR Code</button>
      </div>
    </form>
  );
}

// {"p":"A","cc":"133","txn":"99999","i":[{"v":5432,"q":1},{"v":6666,"q":3},{"v":1234,"q":2}]}
const buildHeader = (txn, confId, platform) => {
  const PLATFORMS = ["A", "I", "W"]; // Android, iOS, Web
  let p = PLATFORMS.indexOf(platform);
  if (p === -1) p = 3;
  if (confId < 0 || confId > 255) {
    throw new Error("confId must be an 8-bit number (0-255).");
  }
  if (txn < 0 || txn > 1048575) {
    throw new Error("txn must be a 20-bit number (0-1048575).");
  }

  // Bit positions:
  // - Bits 31-30: Fixed format = 00
  // - Bits 29-28: Platform (2 bits)
  // - Bits 27-20: confId (8 bits)
  // - Bits 19-0 : txn (20 bits)
  const header =
    ((platform & 0x03) << 28) | // platform in bits 29-28
    ((confId & 0xff) << 20) | // confId in bits 27-20
    (txn & 0xfffff); // txn in bits 19-0

  // Convert the 32-bit header into a 4-byte array in big-endian order:
  const bytes = new Uint8Array(4);
  bytes[0] = (header >> 24) & 0xff; // Most significant byte (bits 31-24)
  bytes[1] = (header >> 16) & 0xff; // Next byte (bits 23-16)
  bytes[2] = (header >> 8) & 0xff; // Next byte (bits 15-8)
  bytes[3] = header & 0xff; // Least significant byte (bits 7-0)

  return bytes;
};

const parseInput = (input) => {
  const { type, value } = input;
  let { txn, cc, p, i } = JSON.parse(value);
  let parsedInput = {};

  switch (type) {
    case "alphanumeric": {
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const items = i.reduce((str, { v, q }) => `${str}${v}:${q}/`, "");
      parsedInput.type = "alphanumeric";
      parsedInput.text = `$1${p ? "%" + p : ""}${
        cc ? "%" + cc : ""
      }%${txn}%${items}$`;
      break;
    }
    case "PER": {
      let hex = "";
      let headerBytes = buildHeader(txn, cc, p);
      let itemsBytes = new Uint8Array(i.length * 3);
      i.forEach(({ v, q }, j) => {
        let idx = j * 3;
        const variantNum = parseInt(v);
        itemsBytes[idx] = variantNum & 0xff;
        itemsBytes[++idx] = (variantNum >> 8) & 0xff;
        itemsBytes[++idx] = parseInt(q) & 0xff;
      });

      hex = headerBytes.reduce((acc, curr) => {
        return acc.concat(curr.toString(16));
      }, hex);
      hex = itemsBytes.reduce((acc, curr) => {
        return acc.concat(curr.toString(16));
      }, hex);

      parsedInput.encoding = "hex";
      parsedInput.type = "byte";
      parsedInput.bytes = hex;
      break;
    }
    default: {
      //parsedInput.encoding = "utf-8";
      parsedInput.type = "byte";
      try {
        const obj = JSON.parse(value);
        parsedInput.text = `${JSON.stringify(obj, null, 0)}`;
      } catch (e) {
        parsedInput.text = value;
      }
    }
  }

  return parsedInput;
};

const sampleInput = JSON.stringify(
  {
    p: "A",
    cc: 133,
    txn: "99999",
    i: [
      {
        v: 5432,
        q: 1,
      },
      {
        v: 6666,
        q: 3,
      },
      {
        v: 1234,
        q: 2,
      },
    ],
  },
  null,
  2
);
