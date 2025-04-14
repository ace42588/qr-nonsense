import React, { useState, useContext } from "react";
import "./styles.css"; // Import your component-specific styles

import {
  ErrorCorrectionSelector,
  VersionSelector,
  DataMaskSelector,
} from "./Selectors";
import { QRDataDispatchContext } from "../context/QRDataContext";
import { Actions } from "../Constants";

const Encodings = ["JSON", "Alphanumeric", "PER"];

export default function MerchForm() {
  const [input, setInput] = useState({ value: sampleInput });
  const [encoding, setEncoding] = useState("JSON");
  const dispatch = useContext(QRDataDispatchContext);

  function handleChangeInput(e) {
    const newInput = { ...input, value: e.target.value };
    setInput(newInput);
    handleChangeOutput();
  };

  function handleChangeEncoding(e) {
    const newEncoding = e.target.value;
    setEncoding(newEncoding);
    handleChangeOutput();
  };
  
  function handleChangeOutput() {
    const order = parseInput(input);
    const output = encodeOrder(order, encoding);
    dispatch({
      type: Actions.ChangeInput,
      payload: {inputs: [output]},
    });
  }

  return (
    <form className="input-form">
      <div className="row">
        <ErrorCorrectionSelector />
      </div>
      <div className="row">
        <VersionSelector />
      </div>
      <div className="row">
        <DataMaskSelector />
      </div>
      <div className="row">
        <div key={0} className="input-group">
          <label htmlFor="encoding">Encoding:</label>
          <select
            id="encoding"
            value={encoding}
            onChange={handleChangeEncoding}
          >
            {Encodings.map((encoding, idx) => (
              <option key={encoding} value={encoding}>
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
          onClick={(e) => {
            e.preventDefault();
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

const encodeOrder = (order, encoding) => {
  console.debug({order, encoding});
  let { transactionId, conferenceCode, platform, items } = order;
  let encodedOrder = {};
    switch (encoding) {
    case "Alphanumeric": {
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const encodedItems = items.reduce((str, { v, q }) => `${str}${v}:${q}/`, "");
      encodedOrder.mode = "alphanumeric";
      encodedOrder.data = `$1${platform}%${conferenceCode}%${transactionId}%${encodedItems}$`;
      break;
    }
    case "PER": {
      let hex = "";
      let headerBytes = buildHeader(transactionId, conferenceCode, platform);
      let itemsBytes = new Uint8Array(items.length * 3);
      items.forEach(({ v, q }, j) => {
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

      encodedOrder.encoding = "hex";
      encodedOrder.mode = "byte";
      encodedOrder.data = hex;
      break;
    }
    default: {
      const obj = { txn: transactionId, cc: conferenceCode, p: platform, i: items };
      encodedOrder.encoding = "utf-8";
      encodedOrder.mode = "byte";
      encodedOrder.data = JSON.stringify(obj);
    }
  }

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
  console.debug({input});
  const { value } = input;
  let { txn: transactionId, cc: conferenceCode, p:platform, i:items } = JSON.parse(value);
  let parsedInput = {transactionId, conferenceCode, platform, items};

  return parsedInput;
};

const sampleOrder = {
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
};

const sampleInput = JSON.stringify(sampleOrder, null, 2);
