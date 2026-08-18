/**
 * Off-thread helpers for image transform, importance map, scan decode, and char-change.
 */

import { getWorkerPool } from "./pool";
import { asImageData, serializeMatrixForWorker } from "./serialize";
import type { ScanDecodeResult } from "./protocol";
import type {
  CharacterChangeSolution,
  CharacterChangeSolverOptions,
} from "@/domain/qr/solver";
import type { QRMatrix } from "@/domain/shared/types";

export async function transformImageOffthread(
  image: HTMLImageElement | ImageBitmap | ImageData,
  canvasSize: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  signal?: AbortSignal
): Promise<ImageData> {
  const pool = getWorkerPool();
  let bitmap: ImageBitmap | undefined;
  let imageData:
    | { data: Uint8ClampedArray; width: number; height: number }
    | undefined;
  const transfer: Transferable[] = [];

  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    bitmap = image;
    transfer.push(image);
  } else if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(image);
      transfer.push(bitmap);
    } else {
      const { transformImageToCanvas } = await import("../image");
      const drawn = await transformImageToCanvas(image, image.width, 1, 0, 0);
      imageData = { data: drawn.data, width: drawn.width, height: drawn.height };
    }
  } else {
    const id = image as ImageData;
    imageData = { data: id.data, width: id.width, height: id.height };
  }

  const result = await pool.enqueue<{
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }>({
    type: "transformImage",
    payload: { bitmap, imageData, canvasSize, scale, offsetX, offsetY },
    transfer,
    signal,
  });
  return asImageData(result);
}

export async function computeImportanceMapOffthread(
  image: ImageData,
  size: number,
  alpha: number,
  signal?: AbortSignal
): Promise<Float32Array> {
  const pool = getWorkerPool();
  return pool.enqueue<Float32Array>({
    type: "importanceMap",
    payload: {
      image: { data: image.data, width: image.width, height: image.height },
      size,
      alpha,
    },
    signal,
  });
}

export async function decodeScanFrameOffthread(
  image: ImageData,
  signal?: AbortSignal
): Promise<ScanDecodeResult | null> {
  const pool = getWorkerPool();
  return pool.enqueue<ScanDecodeResult | null>({
    type: "decodeImage",
    payload: {
      data: image.data,
      width: image.width,
      height: image.height,
    },
    signal,
  });
}

export async function findCharacterChangeOffthread(
  options: CharacterChangeSolverOptions,
  signal?: AbortSignal
): Promise<CharacterChangeSolution | null> {
  const pool = getWorkerPool();
  return pool.enqueue<CharacterChangeSolution | null>({
    type: "charChangeSolve",
    payload: {
      options: {
        ...options,
        matrix: serializeMatrixForWorker(options.matrix) as unknown as QRMatrix,
      },
    },
    signal,
  });
}
