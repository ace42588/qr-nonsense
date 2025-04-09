import React from "react";
import "./MerchForm.css"; // Import your component-specific styles

const modes = ["JSON", "alphanumeric", "PER"]; // Available modes
const sampleInput = {
    "p": "A",
	"cc": 133,
	"txn": "99999",
    "i": [{
            "v": 5432,
            "q": 1
        }, {
            "v": 6666,
            "q": 3
        }, {
            "v": 1234,
            "q": 2
        }
    ]
};

function getMinimumQRCodeVersion(chunks) {
  // Data capacities (in bytes) for Byte mode, Error Correction Level L, for versions 1 to 40.
  // (Source: https://www.thonky.com/qr-code-tutorial/data-capacity-per-version)
  const capacities = [
    17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586,
    644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628,
    1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953,
  ];

  // Helper to compute the number of bits needed for a given chunk under the candidate version.
  // For Byte mode:
  //   - Mode indicator: 4 bits.
  //   - Character count indicator: 8 bits for versions 1-9, 16 bits for versions 10+.
  //   - Data bits: 8 bits per byte.
  function getSegmentBitLength(chunk, version) {
    const modeIndicator = 4;
    // For byte mode in QR codes, the character count indicator is 8 bits for versions 1-9,
    // and 16 bits for versions 10 to 40.
    const ccBits = version <= 9 ? 8 : 16;
    let dataBits;

    if (chunk.encoding === "hex" && typeof chunk.bytes === "string") {
      // Each 2 hex characters represent 1 byte.
      const byteCount = chunk.bytes.length / 2;
      dataBits = byteCount * 8;
    } else if (
      chunk.type === "byte" &&
      typeof chunk.text === "string"
    ) {
      // Use the TextEncoder API to determine the number of UTF-8 bytes.
      const byteCount = chunk.text.length;
      dataBits = byteCount * 8;
    } else if (
      chunk.type === "alphanumeric" &&
      typeof chunk.text === "string"
    ) {
      const byteCount = chunk.text.length;
      dataBits = Math.ceil(byteCount * (11 / 2));
    } else {
      throw new Error("Unsupported chunk encoding or type.");
    }
    return modeIndicator + ccBits + dataBits;
  }

  // Iterate over QR code versions from 1 to 40.
  for (let version = 1; version <= 40; version++) {
    // Get the available capacity for this version in bits.
    const capacityBytes = capacities[version - 1];
    const capacityBits = capacityBytes * 8;

    // Sum up the bits required for all chunks.
    let totalDataBits = 0;
    try {
      for (const chunk of chunks) {
        totalDataBits += getSegmentBitLength(chunk, version);
      }
    } catch (error) {
      console.error(error);
      return null;
    }

    // According to the spec, we can add a terminator of up to 4 bits.
    // (If capacityBits - totalDataBits is less than 4, then that difference is used.)
    const terminatorBits = Math.min(
      4,
      Math.max(0, capacityBits - totalDataBits)
    );
    const totalBitsWithTerminator = totalDataBits + terminatorBits;

    // QR codes work in 8-bit "codewords"; if total bits is not a multiple of 8, it is
    // padded (but that padding still consumes a codeword if any bits are missing).
    const requiredBytes = Math.ceil(totalBitsWithTerminator / 8);

    // If the number of codewords required fits within the capacity, this version is sufficient.
    if (requiredBytes <= capacityBytes) {
      return version;
    }
  }
  throw new Error("Data too large to fit in a QR code version 40.");
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
      parsedInput.text = value;
    }
  }

  return parsedInput;
};

function MerchForm({ inputs, setInputs, processQRCodeData }) {
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
    const version = getMinimumQRCodeVersion(chunks);
    const formatInfo = { errorCorrectionLevel: 1, dataMask: 1 };
    processQRCodeData({ chunks, version, formatInfo });
  };
  
  const setInitialInput = (input) => {
    if (!input.value) {
      input.value = JSON.stringify(sampleInput, null, 2);
      setInputs[input];
    }
    return input.value;
    
  }

  return (
    <form onSubmit={handleInputSubmit} className="merch-form">
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
            {}
            <textarea
              type="text"
              rows={16}
              value={setInitialInput(input)}
              onChange={(e) => handleInputChange(index, e)}
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

export default MerchForm;
