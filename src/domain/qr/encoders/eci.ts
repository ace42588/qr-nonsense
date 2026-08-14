import {
  encodeSegment,
  createDataSymbol,
  createModeIndicator,
  createSymbol,
} from "./utils";
import { QREncodeError } from "./errors";
import { stringToShiftJisBytes } from "./shiftJis";
import { encodeLatin1Bytes, encodeUtf8Bytes } from "./textBytes";

const ECI_MODE = {
  name: "eci",
  bits: 0x7,
};

const BYTE_MODE = {
  name: "byte",
  bits: 0x4,
  thresholds: [
    { max: 256, length: 8 },
    { max: Infinity, length: 16 },
  ],
};

const DEFAULT_ECI = 26;

/**
 * Encode an ECI assignment number as 8, 16, or 24 bits per ISO/IEC 18004:
 *   0–127       : 0 + 7 bits
 *   128–16383   : 10 + 14 bits
 *   16384–999999: 110 + 21 bits
 */
export function encodeEciAssignmentBits(assignment: number): {
  value: number;
  length: number;
} {
  if (!Number.isInteger(assignment) || assignment < 0 || assignment > 999999) {
    throw new QREncodeError(
      `ECI assignment number must be an integer 0–999999, got ${assignment}`
    );
  }
  if (assignment <= 127) {
    return { value: assignment, length: 8 };
  }
  if (assignment <= 16383) {
    return { value: 0x8000 | assignment, length: 16 };
  }
  return { value: 0xc00000 | assignment, length: 24 };
}

export function resolveEciAssignment(encoding: unknown): number {
  if (
    encoding == null ||
    encoding === "" ||
    (typeof encoding === "object" &&
      encoding !== null &&
      !Array.isArray(encoding) &&
      Object.keys(encoding as object).length === 0)
  ) {
    return DEFAULT_ECI;
  }
  if (typeof encoding === "number") {
    if (!Number.isFinite(encoding)) {
      throw new QREncodeError(`Invalid ECI assignment: ${encoding}`);
    }
    return Math.trunc(encoding);
  }
  const s = String(encoding).trim().toLowerCase();
  if (s === "utf-8" || s === "utf8") return 26;
  if (s === "iso-8859-1" || s === "latin1" || s === "latin-1") return 3;
  if (s === "shift-jis" || s === "shift_jis" || s === "sjis") return 20;
  if (s === "ascii" || s === "iso-646") return 29;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  throw new QREncodeError(`Invalid ECI assignment: ${encoding}`);
}

function latin1Bytes(text: string): Uint8Array {
  return encodeLatin1Bytes(text, "ISO-8859-1 (ECI 3)");
}

function asciiBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) {
      throw new QREncodeError(
        `Character "${text[i]}" cannot be encoded as ASCII (ECI 29)`
      );
    }
    bytes[i] = code;
  }
  return bytes;
}

/**
 * Encode the whole string to bytes for the ECI character set.
 * Does not use the per-character first-byte-only path in byte.js.
 */
export function encodeEciPayloadBytes(
  text: string,
  assignment: number
): Uint8Array {
  switch (assignment) {
    case 1:
    case 3:
      return latin1Bytes(text);
    case 20:
      return stringToShiftJisBytes(text);
    case 29:
      return asciiBytes(text);
    case 26:
    default:
      return encodeUtf8Bytes(text);
  }
}

function encodeBytePayload(bytes: Uint8Array) {
  if (!bytes.length) return [];
  const itr = () =>
    (function* () {
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        yield createDataSymbol(
          b,
          `0x${b.toString(16).padStart(2, "0")}`,
          "byte",
          8
        );
      }
    })();
  return encodeSegment(bytes, BYTE_MODE, itr);
}

/**
 * ECI designator (mode 0111, no character-count indicator) followed by a
 * byte-mode segment of the payload.
 */
export function encodeEci(input: string, options: unknown = {}) {
  const text = input || "";
  if (!text) return [];

  const assignment = resolveEciAssignment(options);
  const { value, length } = encodeEciAssignmentBits(assignment);
  const header = [
    createModeIndicator(ECI_MODE),
    createSymbol("eciAssignment", value, String(assignment), length),
  ];
  const payload = encodeBytePayload(encodeEciPayloadBytes(text, assignment));
  return [...header, ...payload];
}
