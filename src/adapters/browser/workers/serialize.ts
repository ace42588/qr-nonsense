/**
 * Structured-clone helpers for worker jobs (strip functions, rehydrate lookups).
 */

import type { QRMatrix, QRModule } from "@/domain/shared/types";
import { attachModuleIndex } from "@/domain/qr/matrix/utils";
import { attachMatrixLookup } from "@/domain/pipeline/context";
import type { GenerationContext } from "@/domain/pipeline/types";
import { isHtmlImage } from "../canvasPort";
import type { SerializedGenerationContext } from "./protocol";

export function serializeMatrixForWorker(matrix: QRMatrix): QRModule[][] {
  return matrix.map((row) =>
    row.map((m) => {
      if (!m) return m;
      return {
        id: m.id,
        bitId: m.bitId,
        bit: {
          id: m.bit?.id,
          value: m.bit?.value ?? 0,
          sourceId: m.bit?.sourceId,
          type: m.bit?.type,
        },
        x: m.x,
        y: m.y,
        isDark: m.isDark,
        isMasked: m.isMasked,
        type: m.type,
        nonData: m.nonData,
        source: m.source ? { ...m.source } : undefined,
      } as QRModule;
    })
  );
}

export function hydrateMatrix(rows: QRModule[][] | QRMatrix | null | undefined): QRMatrix | null {
  if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
  const matrix = rows as QRMatrix;
  attachModuleIndex(matrix, true);
  return attachMatrixLookup(matrix);
}

function serializeMaybeMatrix(
  matrix: QRMatrix | null | undefined
): QRModule[][] | null | undefined {
  if (matrix == null) return matrix;
  return serializeMatrixForWorker(matrix);
}

/**
 * Drop non-cloneable fields (AbortSignal, functions, HTMLImageElement).
 * Call `prepareSourceImage` first on the main thread.
 */
function pixelArray(data: unknown): Uint8ClampedArray | null {
  if (data instanceof Uint8ClampedArray) return data;
  if (data instanceof Uint8Array) return new Uint8ClampedArray(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8ClampedArray(
      data.buffer,
      data.byteOffset,
      data.byteLength
    );
  }
  if (data instanceof ArrayBuffer) return new Uint8ClampedArray(data);
  return null;
}

function serializeImageData(
  image: unknown
): { data: Uint8ClampedArray; width: number; height: number } | null | undefined {
  if (image == null) return image as null | undefined;
  const img = image as { data?: unknown; width?: number; height?: number };
  const data = pixelArray(img.data);
  if (
    !data ||
    typeof img.width !== "number" ||
    typeof img.height !== "number" ||
    img.width <= 0 ||
    img.height <= 0
  ) {
    return undefined;
  }
  return { data, width: img.width, height: img.height };
}

export function serializeContext(
  ctx: GenerationContext
): SerializedGenerationContext {
  const {
    signal: _signal,
    decodePort: _decodePort,
    sourceImage,
    ...rest
  } = ctx as GenerationContext & { decodePort?: unknown };

  return {
    ...rest,
    sourceImage: isHtmlImage(sourceImage) ? undefined : sourceImage,
    targetImage: serializeImageData(ctx.targetImage),
    offscreenCanvasImage: serializeImageData(ctx.offscreenCanvasImage),
    fusedImage: serializeImageData(ctx.fusedImage),
    maskImage: serializeImageData(ctx.maskImage),
    matrix: serializeMaybeMatrix(ctx.matrix) ?? undefined,
    matrixA: serializeMaybeMatrix(ctx.matrixA) ?? undefined,
    matrixB: serializeMaybeMatrix(ctx.matrixB) ?? undefined,
    controlMatrix: serializeMaybeMatrix(ctx.controlMatrix) ?? undefined,
    controlledBits: ctx.controlledBits
      ? Array.from(ctx.controlledBits.entries())
      : undefined,
    editableSelection: ctx.editableSelection
      ? {
          editableSegmentIds: Array.from(ctx.editableSelection.editableSegmentIds),
          appendSegmentIds: Array.from(ctx.editableSelection.appendSegmentIds),
          editableCodewordIndices: ctx.editableSelection.editableCodewordIndices.map(
            (s) => Array.from(s)
          ),
          excludeLastSegmentBits: Array.from(
            ctx.editableSelection.excludeLastSegmentBits
          ),
        }
      : undefined,
  } as SerializedGenerationContext;
}

function hydrateImageField(value: unknown): ImageData | null | undefined {
  if (value == null) return value as null | undefined;
  const serialized = serializeImageData(value);
  if (serialized) return asImageData(serialized);
  if (typeof ImageData !== "undefined" && value instanceof ImageData) {
    return value;
  }
  return undefined;
}

function assignHydratedImage(
  ctx: GenerationContext,
  key: "targetImage" | "offscreenCanvasImage" | "fusedImage" | "maskImage",
  raw: unknown
): void {
  const next = hydrateImageField(raw);
  if (next !== undefined) {
    ctx[key] = next;
    return;
  }
  if (raw == null) {
    ctx[key] = raw as null | undefined;
  }
}

export function hydrateContext(
  raw: SerializedGenerationContext
): GenerationContext {
  const ctx = { ...raw } as unknown as GenerationContext;

  if (raw.matrix) ctx.matrix = hydrateMatrix(raw.matrix as QRModule[][]);
  if (raw.matrixA) ctx.matrixA = hydrateMatrix(raw.matrixA as QRModule[][]);
  if (raw.matrixB) ctx.matrixB = hydrateMatrix(raw.matrixB as QRModule[][]);
  if (raw.controlMatrix) {
    ctx.controlMatrix = hydrateMatrix(raw.controlMatrix as QRModule[][]) ?? undefined;
  }

  assignHydratedImage(ctx, "targetImage", raw.targetImage);
  assignHydratedImage(ctx, "offscreenCanvasImage", raw.offscreenCanvasImage);
  assignHydratedImage(ctx, "fusedImage", raw.fusedImage);
  assignHydratedImage(ctx, "maskImage", raw.maskImage);

  if (Array.isArray(raw.controlledBits)) {
    ctx.controlledBits = new Map(raw.controlledBits as Array<[string, boolean]>);
  }

  const sel = raw.editableSelection as
    | {
        editableSegmentIds: string[];
        appendSegmentIds: string[];
        editableCodewordIndices: number[][];
        excludeLastSegmentBits: string[];
      }
    | undefined;
  if (sel) {
    ctx.editableSelection = {
      editableSegmentIds: new Set(sel.editableSegmentIds),
      appendSegmentIds: new Set(sel.appendSegmentIds),
      editableCodewordIndices: (sel.editableCodewordIndices ?? []).map(
        (arr) => new Set(arr)
      ),
      excludeLastSegmentBits: new Set(sel.excludeLastSegmentBits),
    };
  }

  return ctx;
}

export function collectTransferables(value: unknown, into: Transferable[] = []): Transferable[] {
  if (value == null) return into;
  if (value instanceof ArrayBuffer) {
    into.push(value);
    return into;
  }
  if (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap) {
    into.push(value);
    return into;
  }
  if (ArrayBuffer.isView(value) && value.buffer instanceof ArrayBuffer) {
    into.push(value.buffer);
    return into;
  }
  if (typeof ImageData !== "undefined" && value instanceof ImageData) {
    into.push(value.data.buffer);
    return into;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectTransferables(item, into);
    return into;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectTransferables(v, into);
    }
  }
  return into;
}

export async function bitmapFromHtmlImage(
  image: HTMLImageElement
): Promise<ImageBitmap | ImageData> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(image);
  }
  const { transformImageToCanvas } = await import("../image");
  return transformImageToCanvas(image, image.width, 1, 0, 0);
}

export function asImageData(image: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): ImageData {
  if (typeof ImageData !== "undefined") {
    try {
      const created = new ImageData(image.data, image.width, image.height);
      if (typeof created.width === "number" && created.width === image.width) {
        return created;
      }
    } catch {
      /* continue */
    }
    try {
      const created = new (ImageData as unknown as {
        new (
          width: number,
          height: number,
          data?: Uint8ClampedArray
        ): ImageData;
      })(image.width, image.height, image.data);
      if (typeof created.width === "number" && created.width === image.width) {
        return created;
      }
    } catch {
      /* fall through */
    }
  }
  return {
    data: image.data,
    width: image.width,
    height: image.height,
  } as ImageData;
}
