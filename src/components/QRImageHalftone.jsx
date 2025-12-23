import React, { useCallback } from "react";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { ErrorBanner } from "@/components/ui/message-banner";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useHalftonePatterns } from "@/hooks/useHalftonePatterns";
import { renderHalftoneModule } from "@/domain/halftone/rendering";

export function QRImageHalftone({
  size: initialSize = 480,
  modulePixel = 3, // grid is 3x3 per module
}) {
  // Use shared image transform state
  const {
    transformedImageData,
    canvasSize,
    isLoading: isLoadingTransform,
    error: transformError,
    setCanvasSize,
  } = useImageTransform();
  
  const handleModuleHover = useModuleHover();

  // Use halftone patterns hook
  const { patternsDark, patternsLight, importanceMap } = useHalftonePatterns({
    transformedImageData,
    canvasSize,
    importanceWeight: 0.5,
  });

  // Render module with halftone pattern, using pre-transformed image data and importance map
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!transformedImageData || !importanceMap || !patternsDark || !patternsLight) return;
    
    renderHalftoneModule(ctx, module, moduleX, moduleY, moduleSize, renderCtx, {
      transformedImageData,
      importanceMap,
      patternsDark,
      patternsLight,
      modulePixel,
      reliabilityWeight: 0.0,
    });
    // Note: Highlighting is handled by QRBase after renderModule is called
  }, [transformedImageData, importanceMap, modulePixel, patternsDark, patternsLight]);


  // Listen for canvas size changes from QRBase
  const handleBaseRender = useCanvasSizeSync({
    canvasSize,
    setCanvasSize,
    renderModule,
  });


  return (
    <>
      {transformError && <ErrorBanner message={transformError} title="Image Error" />}
      <QRBase
        size={initialSize}
        renderModule={handleBaseRender}
        onModuleHover={handleModuleHover}
        responsive={true}
      />
    </>
  );
}