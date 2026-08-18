import {
  compositeGifFrames,
  normalizeGifDelayMs,
  scaleImageDataToMaxDimension,
  type GifPatchFrame,
} from "@/domain/image/gif";
import {
  isWebPBuffer,
  parseWebPAnimation,
  wrapWebPFramePayload,
} from "@/domain/image/webp";
import { MAX_IMAGE_DIMENSION } from "@/domain/image";
import type { DecodedGif } from "./gif";

export type DecodedWebP = DecodedGif;

interface ClosableFrame {
  close(): void;
  duration?: number | null;
  displayWidth?: number;
  codedWidth?: number;
  width?: number;
  displayHeight?: number;
  codedHeight?: number;
  height?: number;
}

interface ImageDecoderLike {
  tracks: {
    ready: Promise<void>;
    selectedTrack: { frameCount: number } | null;
  };
  decode(options: { frameIndex: number }): Promise<{
    image: ClosableFrame;
    duration?: number;
  }>;
  close(): void;
}

/**
 * Decode an animated WebP into composited full frames.
 * Still WebP (or a single ANMF) returns null so the still-image path can run.
 */
export async function decodeWebP(
  buffer: ArrayBuffer | Uint8Array
): Promise<DecodedWebP | null> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (!isWebPBuffer(bytes)) {
    return null;
  }

  const parsed = parseWebPAnimation(bytes);
  if (!parsed || parsed.frames.length <= 1) {
    return null;
  }

  const copy = copyToArrayBuffer(bytes);

  try {
    const decoded = await decodeWithImageDecoder(copy);
    if (decoded && decoded.frames.length > 1) {
      return scaleDecoded(decoded, parsed.loopCount);
    }
  } catch {
    // Fall through to ANMF + createImageBitmap.
  }

  const patches: GifPatchFrame[] = [];
  for (const frame of parsed.frames) {
    const still = wrapWebPFramePayload(frame.payload, frame.width, frame.height);
    const imageData = await decodeStillWebPBytes(still);
    patches.push({
      dims: {
        left: frame.left,
        top: frame.top,
        width: imageData.width,
        height: imageData.height,
      },
      delay: frame.durationMs,
      disposalType: frame.dispose === "background" ? 2 : 1,
      patch: imageData.data,
      overwrite: frame.blend === "source",
    });
  }

  const composited = compositeGifFrames(
    parsed.canvasWidth,
    parsed.canvasHeight,
    patches,
    parsed.background
  );
  return scaleDecoded(composited, parsed.loopCount);
}

export { isWebPBuffer };

function scaleDecoded(
  decoded: { frames: ImageData[]; delaysMs: number[] },
  loopCount: number
): DecodedWebP {
  return {
    frames: decoded.frames.map((frame) =>
      scaleImageDataToMaxDimension(frame, MAX_IMAGE_DIMENSION)
    ),
    delaysMs: decoded.delaysMs,
    loopCount,
    warning: null,
  };
}

async function decodeWithImageDecoder(
  buffer: ArrayBuffer
): Promise<{ frames: ImageData[]; delaysMs: number[] } | null> {
  const Ctor = (
    globalThis as {
      ImageDecoder?: new (init: {
        data: BufferSource;
        type: string;
        preferAnimation?: boolean;
      }) => ImageDecoderLike;
    }
  ).ImageDecoder;
  if (!Ctor) return null;

  const decoder = new Ctor({
    data: buffer,
    type: "image/webp",
    preferAnimation: true,
  });
  try {
    await decoder.tracks.ready;
    const count = decoder.tracks.selectedTrack?.frameCount ?? 0;
    if (count <= 1) return null;

    const frames: ImageData[] = [];
    const delaysMs: number[] = [];
    for (let i = 0; i < count; i++) {
      const result = await decoder.decode({ frameIndex: i });
      const image = result.image;
      try {
        frames.push(drawableToImageData(image));
        const durationUs = result.duration ?? image.duration ?? 0;
        delaysMs.push(normalizeGifDelayMs(durationUs / 1000));
      } finally {
        image.close();
      }
    }
    return { frames, delaysMs };
  } finally {
    decoder.close();
  }
}

async function decodeStillWebPBytes(bytes: Uint8Array): Promise<ImageData> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Cannot decode animated WebP in this environment");
  }
  const blob = new Blob([copyToArrayBuffer(bytes)], { type: "image/webp" });
  const bitmap = await createImageBitmap(blob);
  try {
    return drawableToImageData(bitmap);
  } finally {
    bitmap.close();
  }
}

function drawableToImageData(source: ClosableFrame | ImageBitmap): ImageData {
  const width =
    ("displayWidth" in source && source.displayWidth) ||
    ("codedWidth" in source && source.codedWidth) ||
    source.width ||
    0;
  const height =
    ("displayHeight" in source && source.displayHeight) ||
    ("codedHeight" in source && source.codedHeight) ||
    source.height ||
    0;
  if (width <= 0 || height <= 0) {
    throw new Error("WebP frame has invalid dimensions");
  }

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas unavailable");
  }
  ctx.drawImage(source as CanvasImageSource, 0, 0);
  return ctx.getImageData(0, 0, width, height);
}

function createCanvas(
  width: number,
  height: number
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error("No canvas available to decode WebP");
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
