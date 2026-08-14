import { encodeSegment, createDataSymbol } from "./utils";
import { QREncodeError } from "./errors";
import { encodeLatin1Bytes, encodeUtf8Bytes } from "./textBytes";

const mode = {
  name: "byte",
  bits: 0x4,
  thresholds: [
    { max: 256, length: 8 },
    { max: Infinity, length: 16 },
  ],
  groupingRegex: /.{1}/g
};

const createByte = (value, text, inputEncoding = "utf-8") => {
  const codon = createDataSymbol(value, text, mode.name, 8);
  return { ...codon, inputEncoding };
};

function resolveByteEncoding(options) {
  if (options == null || options === "") return "utf-8";
  const s = String(options).trim().toLowerCase();
  if (s === "utf-8" || s === "utf8") return "utf-8";
  if (s === "latin1" || s === "latin-1" || s === "iso-8859-1") return "latin1";
  if (s === "hex") return "hex";
  return s;
}

function bytesToSymbols(bytes, inputEncoding) {
  const symbols = [];
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    const text =
      inputEncoding === "latin1" || (byte >= 32 && byte <= 126)
        ? String.fromCharCode(byte)
        : `0x${byte.toString(16).padStart(2, "0")}`;
    symbols.push(createByte(byte, text, inputEncoding));
  }
  return symbols;
}

export function* iteratorFunc(data, options) {
  const inputEncoding = resolveByteEncoding(options);

  if (inputEncoding === "hex") {
    for (let i = 0; i < data.length; i += 2) {
      const hex = data.substring(i, i + 2);
      const byte = parseInt(hex, 16);
      yield createByte(byte, `0x${hex}`, inputEncoding);
    }
    return;
  }

  let bytes;
  if (inputEncoding === "latin1") {
    bytes = encodeLatin1Bytes(data);
  } else if (inputEncoding === "utf-8") {
    bytes = encodeUtf8Bytes(data);
  } else {
    throw new QREncodeError(`Unsupported byte encoding: ${options}`);
  }

  yield* bytesToSymbols(bytes, inputEncoding);
}

export const encodeByte = (input, options) =>
  encodeSegment(input || "", mode, (data) => iteratorFunc(data, options));
