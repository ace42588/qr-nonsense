import React, { useState, useCallback } from "react";
import { QRBase } from "./QRBase";
import { useQRData } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { ErrorBanner } from "@/components/ui/message-banner";
import { useQArtGeneration } from "@/hooks/useQArtGeneration";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useQRMatrix } from "@/hooks/useQRMatrix";
import { useHalftonePatterns } from "@/hooks/useHalftonePatterns";
import { renderHalftoneModuleWithAreaSampling } from "@/domain/halftone/rendering";

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
  
  const [qartResult, setQartResult] = useState(null);
  
  const handleModuleHover = useModuleHover();

  // QArt-specific options
  const [minDecodeRedundancy, setMinDecodeRedundancy] = useState(0.8);
  const [decodeTrials] = useState(1);
  
  // Use QArt generation hook
  const { isGenerating, generationError } = useQArtGeneration({
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    transformedImageData,
    isLoadingTransform,
    qartResult,
    setQartResult,
    options: {
      minDecodeRedundancy,
      decodeTrials,
    },
  });
  
  // Get matrix from QArt result or fallback to regular QR
  const matrix = useQRMatrix({
    qartResult,
    contextMatrix,
  });

  // Use halftone patterns hook
  const { patternsDark, patternsLight, importanceMap } = useHalftonePatterns({
    transformedImageData,
    canvasSize,
    importanceWeight: 0.5,
  });

  // Render module - combines QArt matrix with halftone patterns
  // QArt ensures QR reliability, halftone enhances visual fidelity
  // After QArt optimization, halftone patterns are selected to minimize visual error with target image
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!module) return;
    
    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    
    // If we have halftone data, use halftone patterns with area sampling
    // The pattern center must match the QArt module value (for reliability)
    // We sample the image across the entire module area to better match halftone patterns
    if (transformedImageData && importanceMap && patternsDark && patternsLight) {
      renderHalftoneModuleWithAreaSampling(ctx, module, moduleX, moduleY, moduleSize, renderCtx, {
        transformedImageData,
        importanceMap,
        patternsDark,
        patternsLight,
        modulePixel,
        reliabilityWeight: 0.0, // QArt already ensures scannability
      });
    } else {
      // Fallback: render QArt matrix normally if halftone data not available
      // Use exact coordinates passed from QRBase (already calculated for edge-to-edge alignment)
      const x = moduleX;
      const y = moduleY;
      const width = renderCtx?.moduleWidth ?? moduleSize;
      const height = renderCtx?.moduleHeight ?? moduleSize;
      // Use exact dimensions to ensure edge-to-edge alignment without gaps or overlaps
      const size = width === height ? width : Math.max(width, height);
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(x, y, size, size);
    }
  }, [transformedImageData, importanceMap, modulePixel, patternsDark, patternsLight]);

  // Listen for canvas size changes from QRBase
  const handleBaseRender = useCanvasSizeSync({
    canvasSize,
    setCanvasSize,
    renderModule,
  });

  const imageError = transformError;

  return (
    <>
      {imageError && <ErrorBanner message={imageError} title="Image Error" />}
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

