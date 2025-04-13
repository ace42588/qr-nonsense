import React, { useState, useContext } from "react";
import "./styles.css"; // Import your component-specific styles

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./Selectors";
import { QRDataDispatchContext } from "../context/QRDataContext";
import { Actions } from "../context/Constants";

const Encodings = ["JSON", "Alphanumeric", "PER"];

export default function MerchForm() {
  const [input, setInput] = useState({ value: sampleInput });
  const [encoding, setEncoding] = useState("JSON");
  const dispatch = useContext(QRDataDispatchContext);

  const handleChangeInput = (e) => {
    const newInput = { ...input, value: e.target.value };
    setInput(newInput);
    dispatch({
      type: Actions.ChangeInput,
      payload: {
        ...parseInput(newInput, encoding),
      },
    });
  };

  const handleChangeEncoding = (e) => {
    const newEncoding = e.target.value;
    setEncoding(newEncoding);
    dispatch({
      type: Actions.ChangeInput,
      payload: { ...parseInput(input, newEncoding) },
    });
  };

  return (
    <form className="input-form">
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
            onChange={handleChangeEncoding}
          >
            {Encodings.map((encoding, idx) => (
              <option key={encoding} value={idx}>
                {encoding}
              </option>
            ))}
          </select>
          {}
          <textarea
            type="text"
            rows={16}
            value={input.value}
            onChange={handleChangeInput}
          />
        </div>
      </div>
      <div className="row">
        <button
          onClick={() => {
            dispatch({
              type: Actions.ChangeInput,
              payload: {
                ...parseInput(input, encoding),
              },
            });
          }}
        >
          Generate QR Code
        </button>
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

const parseInput = (input, encoding) => {
  const { value } = input;
  let { txn, cc, p, i } = JSON.parse(value);
  let parsedInput = {};

  switch (encoding) {
    case "alphanumeric": {
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const items = i.reduce((str, { v, q }) => `${str}${v}:${q}/`, "");
      parsedInput.mode = "alphanumeric";
      parsedInput.data = `$1${p ? "%" + p : ""}${
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
      parsedInput.mode = "byte";
      parsedInput.data = hex;
      break;
    }
    default: {
      parsedInput.encoding = "utf-8";
      parsedInput.mode = "byte";
      try {
        const obj = JSON.parse(value);
        parsedInput.data = `${JSON.stringify(obj, null, 0)}`;
      } catch (e) {
        parsedInput.data = value;
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
