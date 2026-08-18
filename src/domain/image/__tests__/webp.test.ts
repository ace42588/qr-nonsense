import { describe, it, expect } from "vitest";
import {
  isWebPBuffer,
  parseWebPAnimation,
  wrapWebPFramePayload,
} from "@/domain/image/webp";

function fourCC(tag: string): Uint8Array {
  return Uint8Array.from(tag.split("").map((c) => c.charCodeAt(0)));
}

function u32LE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = value & 0xff;
  bytes[1] = (value >> 8) & 0xff;
  bytes[2] = (value >> 16) & 0xff;
  bytes[3] = (value >>> 24) & 0xff;
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function chunk(tag: string, data: Uint8Array): Uint8Array {
  const pad = data.length % 2 === 1 ? new Uint8Array([0]) : new Uint8Array(0);
  return concat(fourCC(tag), u32LE(data.length), data, pad);
}

function riffWebP(...chunks: Uint8Array[]): Uint8Array {
  const body = concat(fourCC("WEBP"), ...chunks);
  return concat(fourCC("RIFF"), u32LE(body.length), body);
}

function writeU24LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
}

function vp8xChunk(width: number, height: number, animation: boolean): Uint8Array {
  const data = new Uint8Array(10);
  if (animation) data[0] |= 0x02;
  writeU24LE(data, 4, width - 1);
  writeU24LE(data, 7, height - 1);
  return chunk("VP8X", data);
}

function animChunk(
  bg: { r: number; g: number; b: number; a?: number } = {
    r: 255,
    g: 255,
    b: 255,
    a: 255,
  }
): Uint8Array {
  const data = new Uint8Array(6);
  data[0] = bg.b;
  data[1] = bg.g;
  data[2] = bg.r;
  data[3] = bg.a ?? 255;
  return chunk("ANIM", data);
}

function anmfChunk(options: {
  left: number;
  top: number;
  width: number;
  height: number;
  durationMs: number;
  blendSource?: boolean;
  disposeBackground?: boolean;
  payload?: Uint8Array;
}): Uint8Array {
  const payload = options.payload ?? fourCC("VP8 ");
  const header = new Uint8Array(16);
  writeU24LE(header, 0, options.left / 2);
  writeU24LE(header, 3, options.top / 2);
  writeU24LE(header, 6, options.width - 1);
  writeU24LE(header, 9, options.height - 1);
  writeU24LE(header, 12, options.durationMs);
  header[15] =
    (options.blendSource ? 0x02 : 0) | (options.disposeBackground ? 0x01 : 0);
  return chunk("ANMF", concat(header, payload));
}

describe("isWebPBuffer", () => {
  it("accepts RIFF/WEBP headers", () => {
    expect(isWebPBuffer(riffWebP(chunk("VP8 ", new Uint8Array(1))))).toBe(true);
  });

  it("rejects GIF and short buffers", () => {
    expect(isWebPBuffer(fourCC("GIF8"))).toBe(false);
    expect(isWebPBuffer(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe("parseWebPAnimation", () => {
  it("returns null for still WebP", () => {
    const still = riffWebP(chunk("VP8 ", new Uint8Array([1, 2, 3, 4])));
    expect(parseWebPAnimation(still)).toBeNull();
  });

  it("reads ANMF geometry, delays, blend, and dispose", () => {
    const file = riffWebP(
      vp8xChunk(10, 8, true),
      animChunk({ r: 10, g: 20, b: 30, a: 255 }),
      anmfChunk({
        left: 0,
        top: 0,
        width: 10,
        height: 8,
        durationMs: 80,
        payload: fourCC("VP8L"),
      }),
      anmfChunk({
        left: 2,
        top: 4,
        width: 4,
        height: 2,
        durationMs: 0,
        blendSource: true,
        disposeBackground: true,
        payload: fourCC("VP8L"),
      })
    );

    const parsed = parseWebPAnimation(file);
    expect(parsed).not.toBeNull();
    expect(parsed?.canvasWidth).toBe(10);
    expect(parsed?.canvasHeight).toBe(8);
    expect(parsed?.background).toEqual({ r: 10, g: 20, b: 30 });
    expect(parsed?.frames).toHaveLength(2);
    expect(parsed?.frames[0]).toMatchObject({
      left: 0,
      top: 0,
      width: 10,
      height: 8,
      durationMs: 80,
      blend: "alpha",
      dispose: "none",
    });
    expect(parsed?.frames[1]).toMatchObject({
      left: 2,
      top: 4,
      width: 4,
      height: 2,
      durationMs: 100,
      blend: "source",
      dispose: "background",
    });
  });
});

describe("wrapWebPFramePayload", () => {
  it("wraps a simple VP8 bitstream as RIFF/WEBP", () => {
    const wrapped = wrapWebPFramePayload(fourCC("VP8 "), 2, 2);
    expect(isWebPBuffer(wrapped)).toBe(true);
    expect(String.fromCharCode(...wrapped.slice(12, 16))).toBe("VP8 ");
  });

  it("inserts VP8X when the payload has an ALPH chunk", () => {
    const alph = chunk("ALPH", new Uint8Array([1, 2, 3]));
    const wrapped = wrapWebPFramePayload(alph, 3, 4);
    expect(isWebPBuffer(wrapped)).toBe(true);
    expect(String.fromCharCode(...wrapped.slice(12, 16))).toBe("VP8X");
  });
});
