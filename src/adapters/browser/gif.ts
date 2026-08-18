import { parseGIF, decompressFrames } from "gifuct-js";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import {
  compositeGifFrames,
  isGifBuffer,
  scaleImageDataToMaxDimension,
  type CompositedGif,
} from "@/domain/image/gif";
import { MAX_IMAGE_DIMENSION } from "@/domain/image";

export interface DecodedGif extends CompositedGif {
  loopCount: number;
  warning: string | null;
}

/**
 * Decode a GIF ArrayBuffer into composited full frames.
 */
export function decodeGif(buffer: ArrayBuffer | Uint8Array): DecodedGif {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!isGifBuffer(bytes)) {
    throw new Error("Not a GIF file");
  }

  const copy = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const parsed = parseGIF(copy);
  const rawFrames = decompressFrames(parsed, true);
  if (!rawFrames.length) {
    throw new Error("GIF has no frames");
  }

  const width = parsed.lsd.width;
  const height = parsed.lsd.height;
  const bgIndex = parsed.lsd.backgroundColorIndex;
  const gct = parsed.gct;
  const bg = gct?.[bgIndex] ?? [255, 255, 255];
  const background = { r: bg[0] ?? 255, g: bg[1] ?? 255, b: bg[2] ?? 255 };

  const composited = compositeGifFrames(
    width,
    height,
    rawFrames.map((frame) => ({
      dims: frame.dims,
      delay: frame.delay,
      disposalType: frame.disposalType,
      patch: frame.patch,
    })),
    background
  );

  const scaled = composited.frames.map((frame) =>
    scaleImageDataToMaxDimension(frame, MAX_IMAGE_DIMENSION)
  );

  return {
    frames: scaled,
    delaysMs: composited.delaysMs,
    loopCount: 0,
    warning: null,
  };
}

/**
 * Encode ImageData frames as a looping GIF89a.
 */
export function encodeGif(
  frames: ImageData[],
  delaysMs: number[]
): Uint8Array {
  if (!frames.length) {
    throw new Error("No frames to encode");
  }

  const gif = GIFEncoder();
  const width = frames[0].width;
  const height = frames[0].height;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (frame.width !== width || frame.height !== height) {
      throw new Error("All GIF frames must be the same size");
    }
    const palette = quantize(frame.data, 256);
    const index = applyPalette(frame.data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: delaysMs[i] ?? 100,
      repeat: i === 0 ? 0 : undefined,
    });
  }

  gif.finish();
  return gif.bytes();
}

export { isGifBuffer };
