import React, { useCallback, useMemo, useState } from "react";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { useQRData } from "@/state/qr/QRDataContext";
import { ErrorBanner } from "@/components/ui/message-banner";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useHalftonePatterns } from "@/hooks/useHalftonePatterns";
import { useRasterizedPlaybackFrames } from "@/hooks/useRasterizedPlaybackFrames";
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
    isAnimated,
    frames,
    frameDelaysMs,
    isLoading: isLoadingTransform,
  } = useImageTransform();

  const { matrix } = useQRData();
  const handleModuleHover = useModuleHover();

  const [halftoneStyle, setHalftoneStyle] = useState("pattern");
  const [minDotSize, setMinDotSize] = useState(DEFAULT_MIN_DOT);
  const [maxDotSize, setMaxDotSize] = useState(DEFAULT_MAX_DOT);

  const currentImage = transformedImageData;

  const { patternsDark, patternsLight, importanceMap, importanceMaps } = useHalftonePatterns({
    transformedImageData: currentImage,
    canvasSize,
    importanceWeight: 0.5,
    frames: isAnimated ? frames : null,
    frameIndex: 0,
  });

  const handleStyleChange = (next) => {
    setHalftoneStyle(next);
    if (next === "dots") {
      resetDotDefaults(setMinDotSize, setMaxDotSize);
    }
  };

  const renderModule = useCallback(
    (ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
      if (!currentImage || !importanceMap || !patternsDark || !patternsLight)
        return;

      const { minDotSize: min, maxDotSize: max } = clampDotSizes(
        minDotSize,
        maxDotSize
      );
      renderHalftoneModule(ctx, module, moduleX, moduleY, moduleSize, renderCtx, {
        transformedImageData: currentImage,
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
      currentImage,
      importanceMap,
      modulePixel,
      patternsDark,
      patternsLight,
      halftoneStyle,
      minDotSize,
      maxDotSize,
    ]
  );

  const gifExport = useMemo(() => {
    if (!isAnimated || frames.length <= 1) return null;
    const { minDotSize: min, maxDotSize: max } = clampDotSizes(minDotSize, maxDotSize);
    return {
      delaysMs: frameDelaysMs,
      getGifFrame: (index, ctx, helpers) => {
        const image = frames[index] ?? frames[0];
        const map = importanceMaps?.[index] ?? importanceMap;
        if (!image || !map || !patternsDark || !patternsLight) return;
        helpers.paintQrCanvas(ctx, {
          matrix: helpers.matrix,
          size: helpers.size,
          quietZone: helpers.quietZone,
          renderPasses: halftoneStyle === "dots" ? 2 : 1,
          renderModule: (c, module, moduleX, moduleY, moduleSize, renderCtx) => {
            renderHalftoneModule(c, module, moduleX, moduleY, moduleSize, renderCtx, {
              transformedImageData: image,
              importanceMap: map,
              patternsDark,
              patternsLight,
              modulePixel,
              reliabilityWeight: 0.0,
              style: halftoneStyle,
              minDotSize: min,
              maxDotSize: max,
            });
          },
        });
      },
    };
  }, [
    isAnimated,
    frames,
    frameDelaysMs,
    importanceMaps,
    importanceMap,
    patternsDark,
    patternsLight,
    minDotSize,
    maxDotSize,
    halftoneStyle,
    modulePixel,
  ]);

  const playbackFrames = useRasterizedPlaybackFrames({
    enabled: isAnimated && !isLoadingTransform && frames.length > 1,
    size: canvasSize || initialSize,
    frameCount: frames.length,
    paintFrame: gifExport?.getGifFrame,
    matrix,
    renderPasses: halftoneStyle === "dots" ? 2 : 1,
  });

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
        gifExport={gifExport}
        playback={
          playbackFrames.length > 1
            ? {
                frames: playbackFrames,
                delaysMs: frameDelaysMs,
                paused: isLoadingTransform,
              }
            : null
        }
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
