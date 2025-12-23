import React, { useCallback, useMemo } from "react";
import { QRBase } from "./QRBase";
import { generatePatterns, choosePattern } from "@/domain/halftone/patterns";
import { computeImportanceMap, getBrightness } from "@/domain/image";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { ErrorBanner, LoadingBanner } from "@/components/ui/message-banner";
import { ImageTransformControls } from "@/components/ui/image-transform-controls";

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

  // Generate patterns
  const patternsDark = React.useMemo(() => generatePatterns(1), []);
  const patternsLight = React.useMemo(() => generatePatterns(0), []);

  // Compute importance map from pre-transformed image data
  const importanceMap = useMemo(() => {
    if (!transformedImageData || !canvasSize) return null;
    return computeImportanceMap(transformedImageData, canvasSize, 0.5);
  }, [transformedImageData, canvasSize]);

  // Render module with halftone pattern, using pre-transformed image data and importance map
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!transformedImageData || !importanceMap || !patternsDark || !patternsLight) return;
    const { size } = renderCtx;
    // Sample at the center of the module (including quiet zone)
    const centerX = Math.floor(moduleX + moduleSize / 2);
    const centerY = Math.floor(moduleY + moduleSize / 2);
    // Clamp to canvas bounds
    const safeX = Math.max(0, Math.min(centerX, size - 1));
    const safeY = Math.max(0, Math.min(centerY, size - 1));
    const idx = (safeY * size + safeX) * 4;
    const r = transformedImageData.data[idx];
    const g = transformedImageData.data[idx + 1];
    const b = transformedImageData.data[idx + 2];
    const brightness = getBrightness(r, g, b) / 255;
    const importance = importanceMap[safeY * size + safeX] || 0;
    if (module.nonData) {
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
      return;
    }
    // Choose and draw pattern
    const patterns = module.isDark ? patternsDark : patternsLight;
    if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
      // Fallback: render solid color if patterns are invalid
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
      return;
    }
    const pattern = choosePattern(patterns, brightness, importance, 0.0);
    if (!pattern || !Array.isArray(pattern) || pattern.length === 0) {
      // Fallback: render solid color if pattern is invalid
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
      return;
    }
    const subSize = moduleSize / modulePixel;
    for (let sy = 0; sy < modulePixel; ++sy) {
      if (!pattern[sy] || !Array.isArray(pattern[sy])) {
        continue; // Skip invalid rows
      }
      for (let sx = 0; sx < modulePixel; ++sx) {
        ctx.fillStyle = pattern[sy][sx] ? "#111" : "#fff";
        ctx.fillRect(
          moduleX + sx * subSize,
          moduleY + sy * subSize,
          subSize,
          subSize
        );
      }
    }
    // Note: Highlighting is handled by QRBase after renderModule is called
  }, [transformedImageData, importanceMap, modulePixel, patternsDark, patternsLight]);


  // Listen for canvas size changes from QRBase
  const handleBaseRender = useCallback((ctx, m, moduleX, moduleY, moduleSize, renderCtx) => {
    if (canvasSize !== renderCtx.size) setCanvasSize(renderCtx.size);
    renderModule(ctx, m, moduleX, moduleY, moduleSize, renderCtx);
  }, [canvasSize, setCanvasSize, renderModule]);


  return (
    <>
      {transformError && <ErrorBanner message={transformError} title="Image Error" />}
      {isLoadingTransform && <LoadingBanner message="Loading image..." />}
      <QRBase
        size={initialSize}
        renderModule={handleBaseRender}
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
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Image Adjustments</h3>
        <ImageTransformControls />
      </div>
    </>
  );
}