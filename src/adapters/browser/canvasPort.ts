/**
 * Canvas factory that works on the main thread and in Web Workers.
 * Prefers OffscreenCanvas; falls back to a DOM canvas in jsdom/tests.
 */

export type Canvas2D = {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
};

export function create2dCanvas(width: number, height: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) return { canvas, ctx };
  }
  throw new Error("No canvas 2D context available");
}

export function isHtmlImage(
  value: unknown
): value is HTMLImageElement {
  return (
    typeof HTMLImageElement !== "undefined" &&
    value instanceof HTMLImageElement
  );
}

export function isImageBitmap(value: unknown): value is ImageBitmap {
  return typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap;
}

export type DrawableImage =
  | HTMLImageElement
  | ImageBitmap
  | ImageData
  | OffscreenCanvas
  | HTMLCanvasElement;
