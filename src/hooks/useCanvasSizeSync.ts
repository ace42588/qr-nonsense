import { useCallback } from "react";

interface RenderContext {
  size: number;
  quietZone: number;
  moduleX: number;
  moduleY: number;
  x: number;
  y: number;
  dimension?: number;
}

type RenderModuleCallback = (
  ctx: CanvasRenderingContext2D,
  module: any,
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  renderCtx: RenderContext
) => void;

interface UseCanvasSizeSyncParams {
  canvasSize: number;
  setCanvasSize: (size: number) => void;
  renderModule: RenderModuleCallback;
}

/**
 * Hook that wraps a renderModule callback to synchronize canvas size
 * with the ImageTransformContext when QRBase renders modules.
 */
export function useCanvasSizeSync({
  canvasSize,
  setCanvasSize,
  renderModule,
}: UseCanvasSizeSyncParams): RenderModuleCallback {
  const handleBaseRender = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      module: any,
      moduleX: number,
      moduleY: number,
      moduleSize: number,
      renderCtx: RenderContext
    ) => {
      // Sync canvas size when QRBase reports a different size
      if (canvasSize !== renderCtx.size) {
        setCanvasSize(renderCtx.size);
      }
      // Call the original renderModule callback
      renderModule(ctx, module, moduleX, moduleY, moduleSize, renderCtx);
    },
    [canvasSize, setCanvasSize, renderModule]
  );

  return handleBaseRender;
}

