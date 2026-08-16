import { createModeIndicator, createSymbol } from "./utils";
import { QREncodeError } from "./errors";
import { MODE } from "../constants/modes";
import { encodeAlphanumeric } from "./alphanumeric";
import { encodeNumeric } from "./numeric";
import { encodeByte } from "./byte";

export type Fnc1Position = "first" | "second";
export type Fnc1PayloadMode = "alphanumeric" | "byte" | "numeric";

export type Fnc1Options = {
  position?: Fnc1Position;
  applicationIndicator?: number | string;
  payloadMode?: Fnc1PayloadMode;
  byteEncoding?: string;
};

/**
 * Encode FNC1 second-position Application Indicator per ISO/IEC 18004:
 * - two-digit number 00–99 → binary value
 * - single Latin letter → ASCII + 100
 * - integer 0–255 accepted as raw 8-bit value
 */
export function encodeApplicationIndicator(raw: unknown): number {
  if (raw == null || raw === "") {
    throw new QREncodeError(
      "FNC1 second position requires an application indicator"
    );
  }

  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 0 || raw > 255) {
      throw new QREncodeError(
        `Application indicator must be an integer 0–255, got ${raw}`
      );
    }
    return raw;
  }

  const s = String(raw).trim();
  if (/^\d{1,2}$/.test(s)) {
    const n = parseInt(s, 10);
    if (n < 0 || n > 99) {
      throw new QREncodeError(
        `Two-digit application indicator must be 0–99, got ${s}`
      );
    }
    return n;
  }
  if (/^[A-Za-z]$/.test(s)) {
    return s.toUpperCase().charCodeAt(0) + 100;
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n < 0 || n > 255) {
      throw new QREncodeError(
        `Application indicator must be 0–255, got ${s}`
      );
    }
    return n;
  }

  throw new QREncodeError(
    `Invalid application indicator "${s}" (use 00–99, A–Z, or 0–255)`
  );
}

export function resolveFnc1Options(options: unknown = {}): {
  position: Fnc1Position;
  applicationIndicator?: number;
  payloadMode: Fnc1PayloadMode;
  byteEncoding: string;
} {
  const opts =
    options != null && typeof options === "object" && !Array.isArray(options)
      ? (options as Fnc1Options)
      : {};

  const position: Fnc1Position =
    opts.position === "second" || options === "second" ? "second" : "first";

  const payloadMode: Fnc1PayloadMode =
    opts.payloadMode === "byte" || opts.payloadMode === "numeric"
      ? opts.payloadMode
      : "alphanumeric";

  const resolved: {
    position: Fnc1Position;
    applicationIndicator?: number;
    payloadMode: Fnc1PayloadMode;
    byteEncoding: string;
  } = {
    position,
    payloadMode,
    byteEncoding: opts.byteEncoding || "utf-8",
  };

  if (position === "second") {
    resolved.applicationIndicator = encodeApplicationIndicator(
      opts.applicationIndicator
    );
  }

  return resolved;
}

function encodePayload(
  text: string,
  payloadMode: Fnc1PayloadMode,
  byteEncoding: string
) {
  if (!text) return [];
  switch (payloadMode) {
    case "numeric":
      return encodeNumeric(text);
    case "byte":
      return encodeByte(text, byteEncoding);
    case "alphanumeric":
    default:
      return encodeAlphanumeric(text);
  }
}

/**
 * FNC1 header (first or second position) optionally followed by a data segment.
 * In alphanumeric mode, `%` is the GS1 group separator (FNC1).
 */
export function encodeFnc1(input: string = "", options: unknown = {}) {
  const { position, applicationIndicator, payloadMode, byteEncoding } =
    resolveFnc1Options(options);

  const header =
    position === "second"
      ? [
          createModeIndicator(MODE.FNC1SecondPosition),
          createSymbol(
            "fnc1ApplicationIndicator",
            applicationIndicator!,
            String(applicationIndicator),
            8
          ),
        ]
      : [createModeIndicator(MODE.FNC1FirstPosition)];

  const text = input || "";
  const payload = encodePayload(text, payloadMode, byteEncoding);
  return [...header, ...payload];
}
