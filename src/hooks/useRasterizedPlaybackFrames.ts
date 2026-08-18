import { useEffect, useRef, useState } from "react";
import { paintQrCanvas } from "@/utils/paintQrCanvas";

export type PlaybackFrame = ImageBitmap | HTMLCanvasElement;

export interface PlaybackPaintHelpers {
  size: number;
  quietZone: number;
  paintQrCanvas: typeof paintQrCanvas;
  matrix: unknown;
  renderPasses: number;
}

export type PlaybackPaintFrame = (
  index: number,
  ctx: CanvasRenderingContext2D,
  helpers: PlaybackPaintHelpers
) => void;

interface UseRasterizedPlaybackFramesParams {
  enabled: boolean;
  size: number;
  quietZone?: number;
  frameCount: number;
  paintFrame?: PlaybackPaintFrame | null;
  matrix?: unknown;
  renderPasses?: number;
}

function closeFrame(frame: PlaybackFrame): void {
  if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
    frame.close();
  }
}

/**
 * Pre-paint animation frames to ImageBitmaps (or canvases) so playback can blit.
 */
export function useRasterizedPlaybackFrames({
  enabled,
  size,
  quietZone = 4,
  frameCount,
  paintFrame,
  matrix,
  renderPasses = 1,
}: UseRasterizedPlaybackFramesParams): PlaybackFrame[] {
  const [frames, setFrames] = useState<PlaybackFrame[]>([]);
  const framesRef = useRef<PlaybackFrame[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function rasterize() {
      if (!enabled || !paintFrame || frameCount <= 1 || size < 8) {
        for (const frame of framesRef.current) closeFrame(frame);
        framesRef.current = [];
        setFrames([]);
        return;
      }

      const painted: PlaybackFrame[] = [];
      try {
        for (let i = 0; i < frameCount; i++) {
          if (cancelled) return;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          paintFrame(i, ctx, {
            size,
            quietZone,
            paintQrCanvas,
            matrix,
            renderPasses,
          });
          if (typeof createImageBitmap === "function") {
            painted.push(await createImageBitmap(canvas));
          } else {
            painted.push(canvas);
          }
        }
        if (cancelled) {
          for (const frame of painted) closeFrame(frame);
          return;
        }
        for (const frame of framesRef.current) closeFrame(frame);
        framesRef.current = painted;
        setFrames(painted);
      } catch {
        for (const frame of painted) closeFrame(frame);
        if (!cancelled) {
          framesRef.current = [];
          setFrames([]);
        }
      }
    }

    void rasterize();
    return () => {
      cancelled = true;
    };
  }, [enabled, size, quietZone, frameCount, paintFrame, matrix, renderPasses]);

  useEffect(() => {
    return () => {
      for (const frame of framesRef.current) closeFrame(frame);
      framesRef.current = [];
    };
  }, []);

  return frames;
}
