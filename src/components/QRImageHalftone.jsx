import React, { useCallback, useState } from "react";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { ErrorBanner } from "@/components/ui/message-banner";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useHalftonePatterns } from "@/hooks/useHalftonePatterns";
import {
  renderHalftoneModule,
  clampDotSizes,
} from "@/domain/halftone/rendering";
import { SettingsPanel } from "@/components/qr-controls/SettingsPanel";
import {
  HalftoneControls,
  DEFAULT_MIN_DOT,
  DEFAULT_MAX_DOT,
  resetDotDefaults,
} from "@/components/qr-controls/HalftoneControls";

export function QRImageHalftone({
  size: initialSize = 480,
  modulePixel = 3, // grid is 3x3 per module
}) {
  const {
    transformedImageData,
    canvasSize,
    error: transformError,
    setCanvasSize,
  } = useImageTransform();

  const handleModuleHover = useModuleHover();

  const [halftoneStyle, setHalftoneStyle] = useState("pattern");
  const [minDotSize, setMinDotSize] = useState(DEFAULT_MIN_DOT);
  const [maxDotSize, setMaxDotSize] = useState(DEFAULT_MAX_DOT);

  const { patternsDark, patternsLight, importanceMap } = useHalftonePatterns({
    transformedImageData,
    canvasSize,
    importanceWeight: 0.5,
  });

  const handleStyleChange = (next) => {
    setHalftoneStyle(next);
    if (next === "dots") {
      resetDotDefaults(setMinDotSize, setMaxDotSize);
    }
  };

  const renderModule = useCallback(
    (ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
      if (!transformedImageData || !importanceMap || !patternsDark || !patternsLight)
        return;

      const { minDotSize: min, maxDotSize: max } = clampDotSizes(
        minDotSize,
        maxDotSize
      );
      renderHalftoneModule(ctx, module, moduleX, moduleY, moduleSize, renderCtx, {
        transformedImageData,
        importanceMap,
        patternsDark,
        patternsLight,
        modulePixel,
        reliabilityWeight: 0.0,
        style: halftoneStyle,
        minDotSize: min,
        maxDotSize: max,
      });
    },
    [
      transformedImageData,
      importanceMap,
      modulePixel,
      patternsDark,
      patternsLight,
      halftoneStyle,
      minDotSize,
      maxDotSize,
    ]
  );

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
        renderPasses={halftoneStyle === "dots" ? 2 : 1}
        onModuleHover={handleModuleHover}
        responsive={true}
      />
      <SettingsPanel title="Halftone Settings">
        <HalftoneControls
          idPrefix="hqr"
          style={halftoneStyle}
          onStyleChange={handleStyleChange}
          minDotSize={minDotSize}
          maxDotSize={maxDotSize}
          onMinDotChange={setMinDotSize}
          onMaxDotChange={setMaxDotSize}
        />
      </SettingsPanel>
    </>
  );
}
