import { describe, it, expect } from "vitest";
import {
  isGifBuffer,
  normalizeGifDelayMs,
  compositeGifFrames,
  createImageData,
  scaleImageDataToMaxDimension,
} from "@/domain/image/gif";
import { decodeGif, encodeGif } from "@/adapters/browser/gif";

function gifHeader(kind: "GIF89a" | "GIF87a" = "GIF89a"): Uint8Array {
  return Uint8Array.from(kind.split("").map((c) => c.charCodeAt(0)));
}

function solidPatch(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return data;
}

describe("isGifBuffer", () => {
  it("accepts GIF87a and GIF89a", () => {
    expect(isGifBuffer(gifHeader("GIF89a").buffer)).toBe(true);
    expect(isGifBuffer(gifHeader("GIF87a"))).toBe(true);
  });

  it("rejects non-GIF bytes", () => {
    expect(isGifBuffer(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isGifBuffer(new Uint8Array([1, 2, 3]))).toBe(false);
  });
});

describe("normalizeGifDelayMs", () => {
  it("uses 100ms when delay is 0 or invalid", () => {
    expect(normalizeGifDelayMs(0)).toBe(100);
    expect(normalizeGifDelayMs(-1)).toBe(100);
    expect(normalizeGifDelayMs(Number.NaN)).toBe(100);
  });

  it("keeps positive delays", () => {
    expect(normalizeGifDelayMs(40)).toBe(40);
  });
});

describe("compositeGifFrames", () => {
  it("composites a static full-frame patch", () => {
    const { frames } = compositeGifFrames(2, 2, [
      {
        dims: { left: 0, top: 0, width: 2, height: 2 },
        delay: 100,
        disposalType: 1,
        patch: solidPatch(2, 2, 255, 0, 0),
      },
    ]);
    expect(frames).toHaveLength(1);
    expect(Array.from(frames[0].data.slice(0, 4))).toEqual([255, 0, 0, 255]);
  });

  it("restores background for disposal 2", () => {
    const red = solidPatch(1, 1, 255, 0, 0);
    const blue = solidPatch(1, 1, 0, 0, 255);
    const { frames } = compositeGifFrames(
      2,
      1,
      [
        {
          dims: { left: 0, top: 0, width: 1, height: 1 },
          delay: 50,
          disposalType: 2,
          patch: red,
        },
        {
          dims: { left: 1, top: 0, width: 1, height: 1 },
          delay: 50,
          disposalType: 1,
          patch: blue,
        },
      ],
      { r: 255, g: 255, b: 255 }
    );
    expect(frames).toHaveLength(2);
    // Frame 0: red | white
    expect(Array.from(frames[0].data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(frames[0].data.slice(4, 8))).toEqual([255, 255, 255, 255]);
    // Frame 1: white (disposal 2 cleared red) | blue
    expect(Array.from(frames[1].data.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(frames[1].data.slice(4, 8))).toEqual([0, 0, 255, 255]);
  });

  it("overwrites the rectangle when overwrite is set", () => {
    const { frames } = compositeGifFrames(2, 1, [
      {
        dims: { left: 0, top: 0, width: 2, height: 1 },
        delay: 50,
        disposalType: 1,
        patch: solidPatch(2, 1, 255, 0, 0),
      },
      {
        dims: { left: 0, top: 0, width: 1, height: 1 },
        delay: 50,
        disposalType: 1,
        patch: solidPatch(1, 1, 0, 255, 0),
        overwrite: true,
      },
    ]);
    expect(Array.from(frames[1].data.slice(0, 4))).toEqual([0, 255, 0, 255]);
    expect(Array.from(frames[1].data.slice(4, 8))).toEqual([255, 0, 0, 255]);
  });
});

describe("scaleImageDataToMaxDimension", () => {
  it("returns the original when already small", () => {
    const img = createImageData(4, 4);
    expect(scaleImageDataToMaxDimension(img, 4096)).toBe(img);
  });
});

describe("encodeGif / decodeGif roundtrip", () => {
  it("round-trips a two-frame GIF", () => {
    const a = createImageData(2, 2, solidPatch(2, 2, 255, 0, 0));
    const b = createImageData(2, 2, solidPatch(2, 2, 0, 0, 255));
    const bytes = encodeGif([a, b], [80, 120]);
    expect(isGifBuffer(bytes)).toBe(true);

    const decoded = decodeGif(bytes);
    expect(decoded.frames).toHaveLength(2);
    expect(decoded.delaysMs[0]).toBe(80);
    expect(decoded.delaysMs[1]).toBe(120);
    expect(decoded.frames[0].width).toBe(2);
    expect(decoded.frames[0].data[0]).toBeGreaterThan(200);
    expect(decoded.frames[1].data[2]).toBeGreaterThan(200);
  });

  it("keeps every source frame through encode and decode", () => {
    const count = 30;
    const frames = Array.from({ length: count }, (_, i) =>
      createImageData(2, 2, solidPatch(2, 2, i % 256, 0, 255 - (i % 256)))
    );
    const delays = frames.map((_, i) => 40 + i * 10);
    const decoded = decodeGif(encodeGif(frames, delays));
    expect(decoded.frames).toHaveLength(count);
    expect(decoded.delaysMs).toEqual(delays);
  });
});
