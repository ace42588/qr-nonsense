import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { QRBase } from "./QRBase";
import { useQRData } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { generateQArt } from "@/domain/qart";
import { generatePatterns, choosePattern } from "@/domain/halftone/patterns";
import { computeImportanceMap, getBrightness } from "@/domain/image";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { ErrorBanner, LoadingBanner } from "@/components/ui/message-banner";
import { ImageTransformControls } from "@/components/ui/image-transform-controls";

export function QRCombined({
  size: initialSize = 480,
  modulePixel = 3, // grid is 3x3 per module for halftone
}) {
  const { 
    matrix: contextMatrix,
    segments,
    codewords,
    blocks,
    versionInfo,
  } = useQRData();
  const { formatInfo } = useInputs();
  
  const errorCorrectionLevel = formatInfo.errorCorrectionLevel;
  
  // Use shared image transform state
  const {
    transformedImageData,
    canvasSize,
    isLoading: isLoadingTransform,
    error: transformError,
    setCanvasSize,
  } = useImageTransform();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [qartResult, setQartResult] = useState(null);
  const searchControllerRef = useRef(null);
  
  const handleModuleHover = useModuleHover();

  // QArt-specific options
  const [minDecodeRedundancy, setMinDecodeRedundancy] = useState(0.8);
  const [decodeTrials] = useState(1);
  
  // Compute importance map from pre-transformed image data
  const importanceMap = useMemo(() => {
    if (!transformedImageData || !canvasSize) return null;
    return computeImportanceMap(transformedImageData, canvasSize, 0.5);
  }, [transformedImageData, canvasSize]);

  // Generate QArt QR code - automatically triggered by state changes
  const generateQArtCode = useCallback(async () => {
    if (!transformedImageData) {
      setGenerationError("No image loaded");
      return;
    }

    if (!segments || segments.length === 0) {
      setGenerationError("No segments available. Please add an input in the left panel.");
      return;
    }

    // Cancel any ongoing generation
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }

    setIsGenerating(true);
    setGenerationError(null);
    setQartResult(null);

    // Create abort controller for interruptible search
    const controller = new AbortController();
    searchControllerRef.current = controller;

    try {
      const result = await generateQArt({
        segments,
        codewords,
        blocks,
        initialMatrix: contextMatrix,
        versionInfo,
        errorCorrectionLevel,
        targetImage: transformedImageData,
        minDecodeRedundancy,
        decodeTrials,
        signal: controller.signal,
      });

      if (!controller.signal.aborted && result) {
        setQartResult(result);
        setGenerationError(null);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("Error generating QArt:", err);
        setGenerationError(err instanceof Error ? err.message : "Failed to generate QArt QR code");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
      }
    }
  }, [transformedImageData, segments, codewords, blocks, contextMatrix, errorCorrectionLevel, versionInfo, minDecodeRedundancy, decodeTrials]);

  // Automatically generate QArt when dependencies change
  // Debounce rapid changes (like slider movements) to avoid excessive regeneration
  useEffect(() => {
    // Don't generate if image is still loading or if we don't have required data
    if (isLoadingTransform || !transformedImageData || !segments || segments.length === 0) {
      return;
    }

    // Debounce rapid changes (especially for sliders)
    const timeoutId = setTimeout(() => {
      generateQArtCode();
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timeoutId);
      // Note: Abort is handled in generateQArtCode when it's called again
    };
  }, [transformedImageData, segments, codewords, blocks, contextMatrix, versionInfo, errorCorrectionLevel, minDecodeRedundancy, isLoadingTransform, generateQArtCode]);

  // Get matrix from QArt result or fallback to regular QR
  const matrix = useMemo(() => {
    if (qartResult?.matrix) {
      return qartResult.matrix;
    }
    return contextMatrix || null;
  }, [qartResult, contextMatrix]);

  // Generate halftone patterns
  const patternsDark = React.useMemo(() => generatePatterns(1), []);
  const patternsLight = React.useMemo(() => generatePatterns(0), []);

  // Render module - combines QArt matrix with halftone patterns
  // QArt ensures QR reliability, halftone enhances visual fidelity
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!module) return;
    
    // For non-data modules (finders, timing, etc.), render normally
    if (module.nonData) {
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
      return;
    }

    // If we have halftone data, use halftone patterns
    // The pattern center must match the QArt module value (for reliability)
    if (transformedImageData && importanceMap) {
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
      
      // Choose pattern based on image brightness, but pattern center must match module.isDark
      // This ensures QR reliability while improving visual match
      const patterns = module.isDark ? patternsDark : patternsLight;
      const pattern = choosePattern(patterns, brightness, importance, 0.0);
      const subSize = moduleSize / modulePixel;
      for (let sy = 0; sy < modulePixel; ++sy) {
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
    } else {
      // Fallback: render QArt matrix normally if halftone data not available
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
    }
  }, [transformedImageData, importanceMap, modulePixel, patternsDark, patternsLight]);

  // Listen for canvas size changes from QRBase
  const handleBaseRender = useCallback((ctx, m, moduleX, moduleY, moduleSize, renderCtx) => {
    if (canvasSize !== renderCtx.size) setCanvasSize(renderCtx.size);
    renderModule(ctx, m, moduleX, moduleY, moduleSize, renderCtx);
  }, [canvasSize, setCanvasSize, renderModule]);

  const imageError = transformError;
  const isLoadingImage = isLoadingTransform;

  return (
    <>
      {imageError && <ErrorBanner message={imageError} title="Image Error" />}
      {isLoadingImage && <LoadingBanner message="Loading image..." />}
      {generationError && <ErrorBanner message={generationError} />}
      <QRBase
        size={initialSize}
        renderModule={handleBaseRender}
        onModuleHover={handleModuleHover}
        responsive={true}
        customMatrix={matrix}
      />
      <div style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Combined QArt + Halftone Settings</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <ImageTransformControls />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Min Decode Rate (QArt):</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={minDecodeRedundancy}
              onChange={(e) => setMinDecodeRedundancy(parseFloat(e.target.value) || 0.8)}
              style={{ flex: 1, padding: '4px 8px' }}
            />
          </div>
          {isGenerating && (
            <div style={{ padding: '8px 16px', color: '#666', fontSize: '14px' }}>
              QArt generation is running automatically...
            </div>
          )}
        </div>
      </div>
    </>
  );
}

