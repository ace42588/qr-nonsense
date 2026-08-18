import { useEffect, useRef, useState } from "react";
import { paintQrCanvas } from "@/utils/paintQrCanvas";

export type PlaybackFrame = HTMLCanvasElement;

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

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Pre-paint animation frames to canvases so playback can blit.
 * Canvases are kept instead of ImageBitmap so a rebuild cannot close a
 * bitmap the rAF loop is still drawing.
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
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;

    if (!enabled || !paintFrame || frameCount <= 1 || size < 8) {
      setFrames((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    let cancelled = false;

    async function rasterize() {
      const painted: PlaybackFrame[] = [];
      for (let i = 0; i < frameCount; i++) {
        if (cancelled || generation !== generationRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        paintFrame!(i, ctx, {
          size,
          quietZone,
          paintQrCanvas,
          matrix,
          renderPasses,
        });
        painted.push(canvas);
        await yieldToUi();
      }
      if (cancelled || generation !== generationRef.current) return;
      setFrames(painted);
    }

    void rasterize();
    return () => {
      cancelled = true;
    };
  }, [enabled, size, quietZone, frameCount, paintFrame, matrix, renderPasses]);

  return frames;
}
