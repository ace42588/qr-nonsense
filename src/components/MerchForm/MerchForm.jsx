import React from "react";
import "./MerchForm.css"; // Import your component-specific styles

const modes = ["base", "p1", "p2"]; // Available modes

// {"p":"A","txn":"99999","i":[{"v":5432,"q":1},{"v":6666,"q":3},{"v":1234,"q":2}]}
const buildHeader = (txn, confId, platform) => {
  const PLATFORMS = ["A", "I", "W"]; // Android, iOS, Web
  let p = PLATFORMS.indexOf(platform);
  if (p === -1) p = 4;
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
    case "p1": {
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
    case "p2": {
      let hex;
      let headerBytes = buildHeader(txn, cc, p)
      parsedInput.encoding = "hex";
      parsedInput.bytes = hex;
      break;
    }
    default: {
      parsedInput.text = value;
    }
  }

  return parsedInput;
};

function InputForm({ inputs, setInputs, processQRCodeData }) {
  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    newInputs[index].value = event.target.value;
    setInputs(newInputs);
  };

  const handleModeChange = (index, newMode) => {
    const newInputs = [...inputs];
    newInputs[index].type = newMode;
    if (newMode === "byte") {
      newInputs[index].encoding = "";
    } else {
      delete newInputs[index].encoding;
    }
    setInputs(newInputs);
  };

  const handleInputSubmit = (event) => {
    event.preventDefault();
    const chunks = inputs.map((i) => parseInput(i));
    const version = 1;
    const formatInfo = { errorCorrectionLevel: 1, dataMask: 1 };
    processQRCodeData({ chunks, version, formatInfo });
  };

  return (
    <form onSubmit={handleInputSubmit} className="input-form">
      <div className="row">
        <h3>Manual Inputs</h3>
      </div>
      <div className="row">
        {inputs.map((input, index) => (
          <div key={index} className="input-group">
            <select
              value={input.type}
              onChange={(e) => handleModeChange(index, e.target.value)}
            >
              {modes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={input.value}
              onChange={(e) => handleInputChange(index, e)}
              placeholder={`Input ${index + 1}`}
            />
          </div>
        ))}
      </div>
      <div className="row">
        <button type="submit">Generate QR Code</button>
      </div>
    </form>
  );
}

export default InputForm;
