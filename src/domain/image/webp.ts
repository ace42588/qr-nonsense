import { normalizeGifDelayMs } from "./gif";

const VP8X_ALPHA_FLAG = 0x10;
const ANMF_BLEND_SOURCE = 0x02;
const ANMF_DISPOSE_BACKGROUND = 0x01;

export interface WebPAnimFrame {
  left: number;
  top: number;
  width: number;
  height: number;
  durationMs: number;
  blend: "alpha" | "source";
  dispose: "none" | "background";
  payload: Uint8Array;
}

export interface ParsedWebPAnimation {
  canvasWidth: number;
  canvasHeight: number;
  background: { r: number; g: number; b: number };
  loopCount: number;
  frames: WebPAnimFrame[];
}

export function isWebPBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = asBytes(buffer);
  if (bytes.length < 12) return false;
  return isFourCC(bytes, 0, "RIFF") && isFourCC(bytes, 8, "WEBP");
}

/**
 * Parse an animated WebP (VP8X + ANMF). Returns null for still WebP or invalid data.
 */
export function parseWebPAnimation(
  buffer: ArrayBuffer | Uint8Array
): ParsedWebPAnimation | null {
  const bytes = asBytes(buffer);
  if (!isWebPBuffer(bytes)) return null;

  let canvasWidth = 0;
  let canvasHeight = 0;
  let background = { r: 255, g: 255, b: 255 };
  let loopCount = 0;
  const frames: WebPAnimFrame[] = [];

  for (const chunk of iterateRiffChunks(bytes, 12)) {
    if (chunk.tag === "VP8X" && chunk.data.length >= 10) {
      canvasWidth = readU24LE(chunk.data, 4) + 1;
      canvasHeight = readU24LE(chunk.data, 7) + 1;
    } else if (chunk.tag === "ANIM" && chunk.data.length >= 6) {
      background = {
        r: chunk.data[2] ?? 255,
        g: chunk.data[1] ?? 255,
        b: chunk.data[0] ?? 255,
      };
      loopCount = chunk.data[4] | (chunk.data[5] << 8);
    } else if (chunk.tag === "ANMF" && chunk.data.length > 16) {
      const left = readU24LE(chunk.data, 0) * 2;
      const top = readU24LE(chunk.data, 3) * 2;
      const width = readU24LE(chunk.data, 6) + 1;
      const height = readU24LE(chunk.data, 9) + 1;
      const durationMs = normalizeGifDelayMs(readU24LE(chunk.data, 12));
      const flags = chunk.data[15] ?? 0;
      frames.push({
        left,
        top,
        width,
        height,
        durationMs,
        blend: flags & ANMF_BLEND_SOURCE ? "source" : "alpha",
        dispose: flags & ANMF_DISPOSE_BACKGROUND ? "background" : "none",
        payload: chunk.data.subarray(16),
      });
    }
  }

  if (frames.length === 0) return null;

  if (canvasWidth <= 0 || canvasHeight <= 0) {
    for (const frame of frames) {
      canvasWidth = Math.max(canvasWidth, frame.left + frame.width);
      canvasHeight = Math.max(canvasHeight, frame.top + frame.height);
    }
  }

  return { canvasWidth, canvasHeight, background, loopCount, frames };
}

/**
 * Wrap an ANMF bitstream as a still WebP so the browser can decode one frame.
 */
export function wrapWebPFramePayload(
  payload: Uint8Array,
  frameWidth: number,
  frameHeight: number
): Uint8Array {
  if (payload.length >= 4 && isFourCC(payload, 0, "VP8X")) {
    return wrapRiff(payload);
  }

  const needsVp8x =
    (payload.length >= 4 && isFourCC(payload, 0, "ALPH")) ||
    payloadHasChunk(payload, "ALPH");
  if (needsVp8x) {
    return wrapRiff(
      concatBytes(makeVp8xChunk(frameWidth, frameHeight, true), payload)
    );
  }

  return wrapRiff(payload);
}

function asBytes(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

function isFourCC(bytes: Uint8Array, offset: number, tag: string): boolean {
  return (
    bytes[offset] === tag.charCodeAt(0) &&
    bytes[offset + 1] === tag.charCodeAt(1) &&
    bytes[offset + 2] === tag.charCodeAt(2) &&
    bytes[offset + 3] === tag.charCodeAt(3)
  );
}

function readU24LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16)
  );
}

function writeU24LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function writeU32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function iterateRiffChunks(
  bytes: Uint8Array,
  start: number
): Array<{ tag: string; data: Uint8Array }> {
  const chunks: Array<{ tag: string; data: Uint8Array }> = [];
  let offset = start;
  while (offset + 8 <= bytes.length) {
    const tag = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );
    const size = readU32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    if (dataStart + size > bytes.length) break;
    chunks.push({ tag, data: bytes.subarray(dataStart, dataStart + size) });
    offset = dataStart + size + (size % 2);
  }
  return chunks;
}

function payloadHasChunk(payload: Uint8Array, tag: string): boolean {
  return iterateRiffChunks(payload, 0).some((chunk) => chunk.tag === tag);
}

function makeVp8xChunk(
  width: number,
  height: number,
  alpha: boolean
): Uint8Array {
  const data = new Uint8Array(10);
  if (alpha) data[0] |= VP8X_ALPHA_FLAG;
  writeU24LE(data, 4, Math.max(1, width) - 1);
  writeU24LE(data, 7, Math.max(1, height) - 1);
  const chunk = new Uint8Array(18);
  chunk[0] = 86; // V
  chunk[1] = 80; // P
  chunk[2] = 56; // 8
  chunk[3] = 88; // X
  writeU32LE(chunk, 4, 10);
  chunk.set(data, 8);
  return chunk;
}

function wrapRiff(payload: Uint8Array): Uint8Array {
  const riffSize = 4 + payload.length;
  const pad = payload.length % 2;
  const out = new Uint8Array(8 + riffSize + pad);
  out[0] = 82; // R
  out[1] = 73; // I
  out[2] = 70; // F
  out[3] = 70; // F
  writeU32LE(out, 4, riffSize);
  out[8] = 87; // W
  out[9] = 69; // E
  out[10] = 66; // B
  out[11] = 80; // P
  out.set(payload, 12);
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, part) => n + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
