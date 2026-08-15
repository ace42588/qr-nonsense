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
  DOT_SIZE_MAX,
} from "@/domain/halftone/rendering";

const DEFAULT_MIN_DOT = 0.25;
const DEFAULT_MAX_DOT = 1.0;

export function QRImageHalftone({
  size: initialSize = 480,
  modulePixel = 3, // grid is 3x3 per module
}) {
  // Use shared image transform state
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

  // Use halftone patterns hook
  const { patternsDark, patternsLight, importanceMap } = useHalftonePatterns({
    transformedImageData,
    canvasSize,
    importanceWeight: 0.5,
  });

  const handleStyleChange = (next) => {
    setHalftoneStyle(next);
    if (next === "dots") {
      setMinDotSize(DEFAULT_MIN_DOT);
      setMaxDotSize(DEFAULT_MAX_DOT);
    }
  };

  const handleMinDotChange = (value) => {
    const next = parseFloat(value);
    setMinDotSize(next);
    if (next > maxDotSize) {
      setMaxDotSize(next);
    }
  };

  const handleMaxDotChange = (value) => {
    const next = parseFloat(value);
    setMaxDotSize(next);
    if (next < minDotSize) {
      setMinDotSize(next);
    }
  };

  // Render module with halftone pattern, using pre-transformed image data and importance map
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!transformedImageData || !importanceMap || !patternsDark || !patternsLight) return;

    const { minDotSize: min, maxDotSize: max } = clampDotSizes(minDotSize, maxDotSize);
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
    // Note: Highlighting is handled by QRBase after renderModule is called
  }, [transformedImageData, importanceMap, modulePixel, patternsDark, patternsLight, halftoneStyle, minDotSize, maxDotSize]);


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
        renderPasses={halftoneStyle === "dots" ? 2 : 1}
        onModuleHover={handleModuleHover}
        responsive={true}
      />
      <div style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Halftone Settings</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="hqr-halftone-style" style={{ minWidth: 120, color: '#666' }}>
              Style:
            </label>
            <select
              id="hqr-halftone-style"
              value={halftoneStyle}
              onChange={(e) => handleStyleChange(e.target.value)}
              style={{ maxWidth: 200, padding: '4px 8px' }}
            >
              <option value="pattern">Pattern</option>
              <option value="dots">Dots</option>
            </select>
          </div>
          {halftoneStyle === "dots" && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="hqr-min-dot-size" style={{ minWidth: 120, color: '#666' }}>
                  Min size:
                </label>
                <input
                  id="hqr-min-dot-size"
                  type="range"
                  min="0"
                  max={DOT_SIZE_MAX}
                  step="0.05"
                  value={minDotSize}
                  onChange={(e) => handleMinDotChange(e.target.value)}
                  style={{ flex: 1, maxWidth: 200 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: 40 }}>
                  {minDotSize.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="hqr-max-dot-size" style={{ minWidth: 120, color: '#666' }}>
                  Max size:
                </label>
                <input
                  id="hqr-max-dot-size"
                  type="range"
                  min="0"
                  max={DOT_SIZE_MAX}
                  step="0.05"
                  value={maxDotSize}
                  onChange={(e) => handleMaxDotChange(e.target.value)}
                  style={{ flex: 1, maxWidth: 200 }}
                />
                <span style={{ fontSize: '12px', color: '#666', minWidth: 40 }}>
                  {maxDotSize.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
