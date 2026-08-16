import { createModeIndicator, createSymbol } from "./utils";
import { QREncodeError } from "./errors";
import { MODE } from "../constants/modes";

export type StructuredAppendOptions = {
  symbolIndex?: number;
  totalSymbols?: number;
  parity?: number;
};

function asInt(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  throw new QREncodeError(`Invalid Structured Append ${label}: ${value}`);
}

/**
 * Resolve Structured Append header fields per ISO/IEC 18004:
 * symbol index 0–15, total symbols 1–16 (stored as total−1), parity 0–255.
 */
export function resolveStructuredAppendOptions(
  options: unknown = {}
): { symbolIndex: number; totalSymbols: number; parity: number } {
  const opts =
    options != null && typeof options === "object" && !Array.isArray(options)
      ? (options as StructuredAppendOptions)
      : {};

  const symbolIndex = asInt(opts.symbolIndex ?? 0, "symbol index");
  const totalSymbols = asInt(opts.totalSymbols ?? 1, "total symbols");
  const parity = asInt(opts.parity ?? 0, "parity");

  if (symbolIndex < 0 || symbolIndex > 15) {
    throw new QREncodeError(
      `Structured Append symbol index must be 0–15, got ${symbolIndex}`
    );
  }
  if (totalSymbols < 1 || totalSymbols > 16) {
    throw new QREncodeError(
      `Structured Append total symbols must be 1–16, got ${totalSymbols}`
    );
  }
  if (symbolIndex >= totalSymbols) {
    throw new QREncodeError(
      `Structured Append symbol index (${symbolIndex}) must be less than total symbols (${totalSymbols})`
    );
  }
  if (parity < 0 || parity > 255) {
    throw new QREncodeError(
      `Structured Append parity must be 0–255, got ${parity}`
    );
  }

  return { symbolIndex, totalSymbols, parity };
}

/**
 * XOR of UTF-8 bytes for Structured Append parity (ISO Byte-mode representation).
 */
export function computeStructuredAppendParity(
  payloads: Iterable<string>
): number {
  let parity = 0;
  const encoder = new TextEncoder();
  for (const text of payloads) {
    if (!text) continue;
    const bytes = encoder.encode(text);
    for (let i = 0; i < bytes.length; i++) {
      parity ^= bytes[i];
    }
  }
  return parity;
}

/**
 * Structured Append header: mode 0011 + 8-bit symbol sequence + 8-bit parity.
 * No character-count indicator; place before data modes in the bitstream.
 */
export function encodeStructuredAppend(
  _input: string = "",
  options: unknown = {}
) {
  const { symbolIndex, totalSymbols, parity } =
    resolveStructuredAppendOptions(options);
  const sequence = (symbolIndex << 4) | (totalSymbols - 1);

  return [
    createModeIndicator(MODE.StructuredAppend),
    createSymbol(
      "structuredAppendSequence",
      sequence,
      `${symbolIndex + 1}/${totalSymbols}`,
      8
    ),
    createSymbol(
      "structuredAppendParity",
      parity,
      `0x${parity.toString(16).padStart(2, "0")}`,
      8
    ),
  ];
}
