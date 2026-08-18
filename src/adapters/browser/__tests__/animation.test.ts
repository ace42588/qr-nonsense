import { describe, it, expect } from "vitest";
import { createImageData } from "@/domain/image/gif";
import { decodeAnimatedImage } from "@/adapters/browser/animation";
import { encodeGif } from "@/adapters/browser/gif";
import { isWebPBuffer } from "@/domain/image/webp";

function solidPatch(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return data;
}

describe("decodeAnimatedImage", () => {
  it("decodes a multi-frame GIF", async () => {
    const a = createImageData(2, 2, solidPatch(2, 2, 255, 0, 0));
    const b = createImageData(2, 2, solidPatch(2, 2, 0, 0, 255));
    const decoded = await decodeAnimatedImage(encodeGif([a, b], [80, 120]));
    expect(decoded?.frames).toHaveLength(2);
    expect(decoded?.delaysMs).toEqual([80, 120]);
  });

  it("returns null for a one-frame GIF", async () => {
    const frame = createImageData(2, 2, solidPatch(2, 2, 255, 0, 0));
    const decoded = await decodeAnimatedImage(encodeGif([frame], [100]));
    expect(decoded).toBeNull();
  });

  it("returns null for still WebP and non-image bytes", async () => {
    const still = Uint8Array.from(
      [82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 0, 0, 0, 0]
    );
    expect(isWebPBuffer(still)).toBe(true);
    expect(await decodeAnimatedImage(still)).toBeNull();
    expect(await decodeAnimatedImage(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});
