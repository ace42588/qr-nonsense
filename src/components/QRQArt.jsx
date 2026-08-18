import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { QRBase } from "./QRBase";
import { useQRData } from "@/state/qr/QRDataContext";
import { useInputs, useInputDispatch } from "@/state/inputs/InputContext";
import { setVersion, updateInput, removeInput, setInputs } from "@/state/inputs/inputActions";
import { createInput } from "@/state/inputs/inputFactory";
import { useQArtResult } from "@/state/qr/QArtContext";
import { Switch } from "@/components/ui/switch";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { rasterizeImageToQRGrid, detectExtremeScaling } from "@/domain/image";
import { ErrorBanner, WarningBanner } from "@/components/ui/message-banner";
import { checkVersionCapacityForQArt, findMinimumQArtVersion } from "@/domain/qart/capacity";
import { getNumBits } from "@/domain/qr/encoders/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQArtGeneration } from "@/hooks/useQArtGeneration";
import { useRasterizedPlaybackFrames } from "@/hooks/useRasterizedPlaybackFrames";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useQRMatrix } from "@/hooks/useQRMatrix";
import { createContrastMatrix } from "@/domain/qart/contrastMatrix";
import { useHalftonePatterns } from "@/hooks/useHalftonePatterns";
import {
  renderHalftoneModuleWithAreaSampling,
  clampDotSizes,
} from "@/domain/halftone/rendering";
import { SettingsPanel, ControlRow } from "@/components/qr-controls/SettingsPanel";
import { EvaluationSummary } from "@/components/qr-controls/EvaluationSummary";
import {
  HalftoneControls,
  DEFAULT_MIN_DOT,
  DEFAULT_MAX_DOT,
  resetDotDefaults,
} from "@/components/qr-controls/HalftoneControls";

export function QRQArt({
  size: initialSize = 480,
  modulePixel = 3, // grid is 3x3 per module for halftone
  combined = false, // Combined mode: QArt first, then always-on halftone
}) {
  const { 
    matrix: contextMatrix,
    segments,
    codewords,
    blocks,
    versionInfo,
  } = useQRData();
  const { formatInfo, inputs } = useInputs();
  const { qartResult, setQartResult } = useQArtResult();
  const dispatch = useInputDispatch();
  
  const errorCorrectionLevel = formatInfo.errorCorrectionLevel;
  const selectedVersion = formatInfo.version; // -1 for Auto, 1-40 for manual selection
  
  // Clear QArt result when component unmounts (user switches away from QArt view)
  useEffect(() => {
    return () => {
      setQartResult(null);
    };
  }, [setQartResult]);
  
  // Use shared image transform state
  const {
    transformedImageData,
    canvasSize,
    isLoading: isLoadingTransform,
    error: transformError,
    setCanvasSize,
    sourceImage,
    scale,
    offsetX,
    offsetY,
    isAnimated,
    sourceFrames,
    frames,
    frameDelaysMs,
  } = useImageTransform();
  
  const handleModuleHover = useModuleHover();

  // QArt-specific options
  const [showRasterizedPreview, setShowRasterizedPreview] = useState(false);
  const [showControlView, setShowControlView] = useState(false);
  const [showContrastView, setShowContrastView] = useState(false);
  const [enableHalftone, setEnableHalftone] = useState(combined); // Halftone effect toggle
  const applyHalftone = combined || enableHalftone;
  const [limitHalftoneToImportant, setLimitHalftoneToImportant] = useState(false); // Limit halftone to important areas
  const [importanceThreshold, setImportanceThreshold] = useState(0.3); // Threshold for importance (0-1)
  const [halftoneStyle, setHalftoneStyle] = useState("pattern");
  const [minDotSize, setMinDotSize] = useState(DEFAULT_MIN_DOT);
  const [maxDotSize, setMaxDotSize] = useState(DEFAULT_MAX_DOT);
  const [priorityFunction, setPriorityFunction] = useState("contrast"); // Priority function type (FR-007)
  const [capacityWarning, setCapacityWarning] = useState(null); // Version capacity warning (FR-015)
  
  // Append data configuration
  const [appendData, setAppendData] = useState({
    enabled: false,
    method: "existing",
    separator: "",
    encodingMode: "alphanumeric"
  });

  // Memoize transformParams to prevent constant regeneration
  // Only recreate when scale, offsetX, or offsetY actually change
  const transformParams = useMemo(() => {
    if (!sourceImage && sourceFrames.length === 0) return null;
    return { scale, offsetX, offsetY };
  }, [sourceImage, sourceFrames.length, scale, offsetX, offsetY]);

  // Memoize appendData options to prevent constant regeneration
  const appendDataOptions = useMemo(() => {
    return appendData.enabled ? appendData : undefined;
  }, [appendData]);

  // Use QArt generation hook
  const { isGenerating, generationError, frameResults, generationProgress } = useQArtGeneration({
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
      priorityFunction,
      appendData: appendDataOptions,
      minDecodeRedundancy: 0.8,
      decodeTrials: 1,
    },
    sourceImage,
    transformParams,
    isAnimated,
    sourceFrames,
    transformedFrames: frames,
  });

  // Calculate user input bits (excluding padding segments) (FR-014)
  const userInputBits = useMemo(() => {
    if (!segments || segments.length === 0) return 0;
    // Filter out padding segments to get only user input bits
    const userSegments = segments.filter(s => s.type !== "padding");
    return getNumBits(userSegments);
  }, [segments]);

  // Check version capacity for QArt (FR-014, FR-015)
  const capacityCheck = useMemo(() => {
    if (!transformedImageData || !versionInfo || !segments || segments.length === 0) {
      return null;
    }
    return checkVersionCapacityForQArt(versionInfo, userInputBits, transformedImageData);
  }, [transformedImageData, versionInfo, userInputBits, segments]);

  const extremeScaling = useMemo(() => {
    const src = sourceImage || sourceFrames[0];
    if (!src || !versionInfo) return { isExtreme: false, warning: null };
    const qrDimension = versionInfo.version * 4 + 17;
    const maxDim = Math.max(src.width, src.height);
    if (!maxDim) return { isExtreme: false, warning: null };
    return detectExtremeScaling(qrDimension / maxDim);
  }, [sourceImage, sourceFrames, versionInfo]);

  // Track if we've auto-upgraded to prevent infinite loops
  const autoUpgradedVersionRef = useRef(null);
  const previousSelectedVersionRef = useRef(selectedVersion);
  const previousInputsRef = useRef({ userInputBits, imageHash: transformedImageData ? `${transformedImageData.width}x${transformedImageData.height}` : null });

  // Reset auto-upgrade tracking when user manually changes version or when inputs/image change significantly
  useEffect(() => {
    const currentImageHash = transformedImageData ? `${transformedImageData.width}x${transformedImageData.height}` : null;
    const inputsChanged = 
      previousInputsRef.current.userInputBits !== userInputBits ||
      previousInputsRef.current.imageHash !== currentImageHash;

    if (previousSelectedVersionRef.current !== selectedVersion) {
      // User changed version manually
      if (selectedVersion === -1) {
        // User switched back to Auto mode - reset tracking
        autoUpgradedVersionRef.current = null;
      } else {
        // User manually selected a version - clear auto-upgrade tracking
        autoUpgradedVersionRef.current = null;
      }
      previousSelectedVersionRef.current = selectedVersion;
    } else if (inputsChanged && selectedVersion === -1) {
      // Inputs or image changed while in Auto mode - reset tracking to allow recalculation
      autoUpgradedVersionRef.current = null;
    }

    // Update refs
    previousInputsRef.current = { userInputBits, imageHash: currentImageHash };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, userInputBits, transformedImageData]);

  // Automatically select appropriate version when capacity is insufficient and Auto mode is selected
  useEffect(() => {
    // Skip if we don't have all required data
    if (!capacityCheck || !transformedImageData || !segments || segments.length === 0) {
      setCapacityWarning(null);
      return;
    }

    // If capacity is sufficient, clear warning and reset auto-upgrade tracking if in Auto mode
    if (capacityCheck.hasCapacity) {
      if (selectedVersion === -1) {
        // In Auto mode with sufficient capacity - reset tracking so we can downgrade if inputs change
        autoUpgradedVersionRef.current = null;
      }
      setCapacityWarning(null);
      return;
    }

    // Capacity is insufficient
    if (selectedVersion === -1) {
      // Auto mode: find and set appropriate version
      const appropriateVersion = findMinimumQArtVersion(
        userInputBits,
        transformedImageData,
        errorCorrectionLevel
      );

      if (appropriateVersion) {
        // Only upgrade if we haven't already upgraded to this version, or if inputs/image changed
        const currentVersion = versionInfo?.version;
        const needsUpgrade = 
          appropriateVersion.version !== autoUpgradedVersionRef.current ||
          (currentVersion && currentVersion < appropriateVersion.version);

        if (needsUpgrade) {
          autoUpgradedVersionRef.current = appropriateVersion.version;
          dispatch(setVersion(appropriateVersion.version));
          setCapacityWarning(null); // Clear warning since we're auto-upgrading
        }
      } else {
        // No version found with sufficient capacity
        setCapacityWarning("No QR version has sufficient capacity for QArt generation with this image and data.");
      }
    } else {
      // User manually selected a version with insufficient capacity - show warning
      setCapacityWarning(capacityCheck.warning || "Insufficient capacity for QArt generation");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    capacityCheck,
    selectedVersion,
    transformedImageData,
    segments,
    userInputBits,
    errorCorrectionLevel,
    versionInfo,
    dispatch,
  ]);

  // Spec 003 FR-013: write optimized append text into a dedicated variation input
  // so it appears in the sidebar. qartVariation inputs are excluded from encoding.
  useEffect(() => {
    const existing = inputs.find((input) => input.qartVariation);
    if (!appendData.enabled) {
      if (existing) {
        dispatch(removeInput(existing.id));
      }
      return;
    }
    const append = qartResult?.optimizedAppendData;
    if (!append) return;

    const text = append.originalText ?? "";
    const mode = append.encodingMode || "byte";
    if (existing) {
      if (existing.data !== text || existing.text !== text || existing.mode !== mode) {
        dispatch(updateInput(existing.id, { text, data: text, mode }));
      }
      return;
    }

    const variation = createInput({
      type: "string",
      label: "QArt append",
      text,
      data: text,
      mode,
      qartVariation: true,
    });
    dispatch(setInputs({ inputs: [...inputs, variation] }));
  }, [
    appendData.enabled,
    qartResult?.optimizedAppendData,
    inputs,
    dispatch,
  ]);

  // Get matrix from QArt result or fallback to regular QR
  // CRITICAL: Always use the actual QR matrix, never the control matrix
  // The control matrix is only for visualization and should not replace the underlying data
  // CRITICAL: When qartResult exists, ONLY use qartResult.matrix to avoid mutations
  // Never mix qartResult.matrix with contextMatrix as they may share references
  const matrix = useQRMatrix({
    qartResult,
    contextMatrix,
  });
  
  // Get control matrix separately for visualization only
  const controlMatrix = useMemo(() => {
    return qartResult?.controlMatrix || null;
  }, [qartResult?.controlMatrix]);

  // Get contrast matrix for visualization
  const contrastMatrix = useMemo(() => {
    if (!qartResult?.contrastGrid || !matrix) return null;
    return createContrastMatrix(matrix, qartResult.contrastGrid);
  }, [qartResult?.contrastGrid, matrix]);

  // Use halftone patterns hook (only when halftone is enabled)
  // CRITICAL: Use offscreen canvas from qartResult (QR dimension-based) for consistency
  // This ensures halftone matches what QArt actually optimized
  const halftoneImageData = qartResult?.offscreenCanvasImage || transformedImageData;
  const qartHalftoneFrames = useMemo(() => {
    if (!isAnimated || frameResults.length <= 1) return null;
    const images = frameResults.map((r) => r.offscreenCanvasImage).filter(Boolean);
    return images.length > 1 ? images : null;
  }, [isAnimated, frameResults]);

  const { patternsDark, patternsLight, importanceMap, importanceMaps } = useHalftonePatterns({
    transformedImageData: halftoneImageData,
    canvasSize: halftoneImageData?.width || canvasSize,
    importanceWeight: 0.5,
    frames: qartHalftoneFrames,
    frameIndex: 0,
  });

  // Compute rasterized target grid for preview
  // CRITICAL: Use offscreen canvas from qartResult (QR dimension-based) for consistency
  // This ensures the preview matches what QArt actually optimized
  // NOTE: When offscreenCanvasImage is available, it's stable and doesn't change on window resize
  // When it's not available, we fall back to transformedImageData
  const rasterizedGrid = useMemo(() => {
    // Prefer offscreen canvas from qartResult (QR dimension-based, stable)
    // This is stable and doesn't change when window resizes
    const imageData = qartResult?.offscreenCanvasImage || transformedImageData;
    if (!imageData) {
      return null;
    }
    // Use qartResult matrix for dimension, or fallback to contextMatrix
    const sourceMatrix = qartResult?.matrix || contextMatrix;
    if (!sourceMatrix) {
      return null;
    }
    const dimension = sourceMatrix.length;
    try {
      const grid = rasterizeImageToQRGrid(imageData, dimension);
      return grid;
    } catch (err) {
      console.error("QRQArt: Error rasterizing image", err);
      return null;
    }
  }, [
    qartResult?.offscreenCanvasImage, 
    qartResult?.matrix, 
    transformedImageData, // Fallback when offscreenCanvasImage is not available
    contextMatrix
  ]);

  // Force canvas redraw when preview toggle changes
  // CRITICAL: Use a stable key based on qartResult, not on visualization toggles
  // This prevents unnecessary remounts that could trigger mutations
  // Visualization changes are handled in renderModule, not by remounting
  const canvasKey = useMemo(() => {
    // Use qartResult matrix length for stability, or a fixed key if no result
    const matrixLength = qartResult?.matrix?.length || matrix?.length || 0;
    return `qart-canvas-${matrixLength}`;
  }, [qartResult?.matrix?.length, matrix?.length]);

  // Render module - QArt uses the generated matrix directly, optionally with halftone
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!module) return;
    
    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    
    // Use exact coordinates passed from QRBase (already calculated for edge-to-edge alignment)
    // If renderCtx has exact dimensions, use those; otherwise use moduleSize for square modules
    const x = moduleX;
    const y = moduleY;
    const width = renderCtx?.moduleWidth ?? moduleSize;
    const height = renderCtx?.moduleHeight ?? moduleSize;
    // Use exact dimensions to ensure edge-to-edge alignment without gaps or overlaps
    const size = width === height ? width : Math.max(width, height);
    
    // Render base layer: halftone, contrast view, control view, or default
    // QArt generation completes first, then halftone is applied on top
    // CRITICAL: Use halftoneImageData (offscreen canvas) to match the importanceMap
    if (applyHalftone && qartResult && halftoneImageData && importanceMap && patternsDark && patternsLight) {
      // Use halftone rendering with area sampling (same as Combined mode)
      const { minDotSize: min, maxDotSize: max } = clampDotSizes(minDotSize, maxDotSize);
      renderHalftoneModuleWithAreaSampling(ctx, module, moduleX, moduleY, moduleSize, renderCtx, {
        transformedImageData: halftoneImageData, // Use offscreen canvas image to match importanceMap
        importanceMap,
        patternsDark,
        patternsLight,
        modulePixel,
        reliabilityWeight: 0.0, // QArt already ensures scannability
        importanceThreshold: limitHalftoneToImportant ? importanceThreshold : undefined,
        style: halftoneStyle,
        minDotSize: min,
        maxDotSize: max,
      });
    } else if (showContrastView && contrastMatrix && renderCtx) {
      // If contrast view is enabled, show contrast heatmap
      const { x: qrX, y: qrY } = renderCtx;
      const contrastModule = contrastMatrix[qrY]?.[qrX];
      if (contrastModule && contrastModule._contrastColor !== undefined) {
        // Render contrast heatmap
        const rgb = contrastModule._contrastColor;
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = rgb & 0xff;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, size, size);
      } else {
        // Fallback to default rendering if contrast data not available
        ctx.fillStyle = module.isDark ? "black" : "white";
        ctx.fillRect(x, y, size, size);
      }
    } else if (showControlView && controlMatrix && renderCtx) {
      // If control view is enabled, check the control matrix for visualization data
      const { x: qrX, y: qrY } = renderCtx;
      const controlModule = controlMatrix[qrY]?.[qrX];
      if (controlModule && controlModule._controlGray !== undefined) {
        // Render as gray from control matrix visualization
        const gray = controlModule._controlGray;
        const r = (gray >> 16) & 0xff;
        const g = (gray >> 8) & 0xff;
        const b = gray & 0xff;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, size, size);
      } else {
        // Fallback to default rendering if control data not available
        ctx.fillStyle = module.isDark ? "black" : "white";
        ctx.fillRect(x, y, size, size);
      }
    } else {
      // Default rendering - always use the actual module's isDark value
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(x, y, size, size);
    }
    
    // Overlay rasterized preview if enabled (works on top of any base rendering)
    // Only on the final pass so two-pass dots does not double the overlay
    const pass = renderCtx?.pass ?? 0;
    const passes = renderCtx?.passes ?? 1;
    if (showRasterizedPreview && rasterizedGrid && renderCtx && pass === passes - 1) {
      // renderCtx has x, y properties from QRBase
      const { x: qrX, y: qrY } = renderCtx;
      // Get dimension from renderCtx or matrix
      const dimension = renderCtx.dimension || (matrix ? matrix.length : 0);
      if (dimension > 0 && qrX >= 0 && qrY >= 0 && qrX < dimension && qrY < dimension) {
        const gridIndex = qrY * dimension + qrX;
        if (gridIndex >= 0 && gridIndex < rasterizedGrid.length) {
          const brightness = rasterizedGrid[gridIndex];
          // Draw colored overlay to make it very visible
          // Dark areas = red tint, light areas = blue tint
          ctx.save();
          ctx.globalAlpha = 0.5;
          if (brightness < 0.5) {
            // Dark area - draw red tint
            ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
          } else {
            // Light area - draw blue tint
            ctx.fillStyle = "rgba(0, 0, 255, 0.6)";
          }
          ctx.fillRect(x, y, size, size);
          ctx.restore();
        }
      }
    }
  }, [applyHalftone, limitHalftoneToImportant, importanceThreshold, halftoneStyle, minDotSize, maxDotSize, qartResult, halftoneImageData, importanceMap, patternsDark, patternsLight, modulePixel, showRasterizedPreview, showControlView, showContrastView, rasterizedGrid, matrix, controlMatrix, contrastMatrix]);


  // Listen for canvas size changes from QRBase
  // Wrap renderModule with canvas size sync and dimension enhancement
  const baseRenderModule = useCallback((ctx, m, moduleX, moduleY, moduleSize, renderCtx) => {
    // Add dimension to renderCtx for preview overlay
    const enhancedRenderCtx = {
      ...renderCtx,
      dimension: matrix ? matrix.length : renderCtx.dimension,
    };
    renderModule(ctx, m, moduleX, moduleY, moduleSize, enhancedRenderCtx);
  }, [renderModule, matrix]);

  const handleBaseRender = useCanvasSizeSync({
    canvasSize,
    setCanvasSize,
    renderModule: baseRenderModule,
  });

  const gifExport = useMemo(() => {
    if (!isAnimated || frameResults.length <= 1) return null;
    const { minDotSize: min, maxDotSize: max } = clampDotSizes(minDotSize, maxDotSize);
    return {
      delaysMs: frameDelaysMs,
      getGifFrame: (index, ctx, helpers) => {
        const result = frameResults[index] ?? frameResults[0];
        if (!result?.matrix) return;
        const image = result.offscreenCanvasImage || transformedImageData;
        const map = importanceMaps?.[index] ?? importanceMap;
        helpers.paintQrCanvas(ctx, {
          matrix: result.matrix,
          size: helpers.size,
          quietZone: helpers.quietZone,
          renderPasses: applyHalftone && halftoneStyle === "dots" ? 2 : 1,
          renderModule: (c, module, moduleX, moduleY, moduleSize, renderCtx) => {
            if (applyHalftone && image && map && patternsDark && patternsLight) {
              renderHalftoneModuleWithAreaSampling(
                c,
                module,
                moduleX,
                moduleY,
                moduleSize,
                renderCtx,
                {
                  transformedImageData: image,
                  importanceMap: map,
                  patternsDark,
                  patternsLight,
                  modulePixel,
                  reliabilityWeight: 0.0,
                  importanceThreshold: limitHalftoneToImportant
                    ? importanceThreshold
                    : undefined,
                  style: halftoneStyle,
                  minDotSize: min,
                  maxDotSize: max,
                }
              );
              return;
            }
            c.fillStyle = module.isDark ? "black" : "white";
            c.fillRect(
              moduleX,
              moduleY,
              renderCtx?.moduleWidth ?? moduleSize,
              renderCtx?.moduleHeight ?? moduleSize
            );
          },
        });
      },
    };
  }, [
    isAnimated,
    frameResults,
    frameDelaysMs,
    transformedImageData,
    importanceMaps,
    importanceMap,
    patternsDark,
    patternsLight,
    applyHalftone,
    halftoneStyle,
    minDotSize,
    maxDotSize,
    modulePixel,
    limitHalftoneToImportant,
    importanceThreshold,
  ]);

  const playbackFrames = useRasterizedPlaybackFrames({
    enabled: isAnimated && !isGenerating && frameResults.length > 1,
    size: canvasSize || initialSize,
    frameCount: frameResults.length,
    paintFrame: gifExport?.getGifFrame,
    matrix,
    renderPasses: applyHalftone && halftoneStyle === "dots" ? 2 : 1,
  });

  return (
    <>
      {transformError && <ErrorBanner message={transformError} title="Image Error" />}
      {extremeScaling?.isExtreme && extremeScaling.warning && (
        <WarningBanner message={extremeScaling.warning} title="Image scaling" />
      )}
      {capacityWarning && <WarningBanner message={capacityWarning} title="Capacity Warning" />}
      {qartResult?.scannabilityWarning && (
        <WarningBanner message={qartResult.scannabilityWarning} title="Scannability" />
      )}
      {generationError && <ErrorBanner message={generationError} />}
      <QRBase
        key={canvasKey}
        size={initialSize}
        renderModule={handleBaseRender}
        renderPasses={applyHalftone && halftoneStyle === "dots" ? 2 : 1}
        onModuleHover={handleModuleHover}
        responsive={true}
        customMatrix={matrix}
        gifExport={gifExport}
        playback={
          playbackFrames.length > 1
            ? {
                frames: playbackFrames,
                delaysMs: frameDelaysMs,
                paused: isGenerating || isLoadingTransform,
              }
            : null
        }
      />
      {qartResult?.evaluation && (
        <EvaluationSummary evaluation={qartResult.evaluation} />
      )}
      <SettingsPanel
        title={combined ? "Combined QArt + Halftone Settings" : "QArt Settings"}
      >
        {!combined && (
          <ControlRow
            label="Enable Halftone:"
            htmlFor="enable-halftone"
            hint="Apply halftone patterns for enhanced visual fidelity"
          >
            <Switch
              id="enable-halftone"
              checked={enableHalftone}
              onCheckedChange={setEnableHalftone}
              title="Apply halftone effect after QArt generation completes"
            />
          </ControlRow>
        )}
        {applyHalftone && (
          <HalftoneControls
            idPrefix="qart"
            style={halftoneStyle}
            onStyleChange={(next) => {
              setHalftoneStyle(next);
              if (next === "dots") resetDotDefaults(setMinDotSize, setMaxDotSize);
            }}
            minDotSize={minDotSize}
            maxDotSize={maxDotSize}
            onMinDotChange={setMinDotSize}
            onMaxDotChange={setMaxDotSize}
            showImportance
            limitToImportant={limitHalftoneToImportant}
            onLimitToImportantChange={setLimitHalftoneToImportant}
            importanceThreshold={importanceThreshold}
            onImportanceThresholdChange={setImportanceThreshold}
          />
        )}

        <SettingsPanel title="Advanced" collapsible defaultOpen={false} className="mt-1 border-dashed">
          <ControlRow
            label="Preview Rasterized:"
            htmlFor="preview-rasterized"
            hint="Overlay target image on QR code"
          >
            <Switch
              id="preview-rasterized"
              checked={showRasterizedPreview}
              onCheckedChange={setShowRasterizedPreview}
              title="Show rasterized target image overlay on QR code for troubleshooting"
            />
          </ControlRow>
          <ControlRow
            label="Show Control View:"
            htmlFor="show-control"
            hint="Highlight controllable modules"
          >
            <Switch
              id="show-control"
              checked={showControlView}
              onCheckedChange={setShowControlView}
              title="Show which modules are controllable (black/white = controlled, gray = uncontrolled)"
            />
          </ControlRow>
          <ControlRow
            label="Show Contrast Map:"
            htmlFor="show-contrast"
            hint="Show contrast heatmap"
          >
            <Switch
              id="show-contrast"
              checked={showContrastView}
              onCheckedChange={setShowContrastView}
              title="Show contrast (variance) heatmap (bright = high contrast, dark = low contrast)"
            />
          </ControlRow>
          <ControlRow label="Priority Function:">
            <div className="flex flex-1 flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="priorityFunction"
                  value="contrast"
                  checked={priorityFunction === "contrast"}
                  onChange={(e) => setPriorityFunction(e.target.value)}
                />
                Contrast-based
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="priorityFunction"
                  value="random"
                  checked={priorityFunction === "random"}
                  onChange={(e) => setPriorityFunction(e.target.value)}
                />
                Random
              </label>
            </div>
          </ControlRow>

          <div className="mt-1 grid gap-3 border-t border-border pt-3">
            <h4 className="text-sm font-semibold text-foreground">Append Data</h4>
            <ControlRow
              label="Enable Append:"
              htmlFor="append-enabled"
              hint="Append optimizable data (QArt will modify it to match image)"
            >
              <Switch
                id="append-enabled"
                checked={appendData.enabled}
                onCheckedChange={(checked) =>
                  setAppendData({ ...appendData, enabled: checked })
                }
                title="Append additional data that QArt can optimize (like padding bits) to match the target image"
              />
            </ControlRow>

            {appendData.enabled && (
              <>
                <ControlRow label="Append Method:">
                  <div className="flex flex-1 flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="appendMethod"
                        value="existing"
                        checked={appendData.method === "existing"}
                        onChange={(e) =>
                          setAppendData({ ...appendData, method: e.target.value })
                        }
                      />
                      Existing Segment
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="appendMethod"
                        value="new"
                        checked={appendData.method === "new"}
                        onChange={(e) =>
                          setAppendData({ ...appendData, method: e.target.value })
                        }
                      />
                      New Segment
                    </label>
                  </div>
                </ControlRow>

                {appendData.method === "existing" && (
                  <div className="flex max-w-sm flex-col gap-1">
                    <Label htmlFor="append-separator">Separator:</Label>
                    <Input
                      id="append-separator"
                      type="text"
                      value={appendData.separator}
                      onChange={(e) =>
                        setAppendData({ ...appendData, separator: e.target.value })
                      }
                      placeholder="Separator (must match segment encoding mode)"
                    />
                    <span className="text-xs text-muted-foreground">
                      Separator will be inserted between original data and appended data
                    </span>
                  </div>
                )}

                {appendData.method === "new" && (
                  <>
                    <div className="flex max-w-sm flex-col gap-1">
                      <Label htmlFor="append-encoding-mode">Encoding Mode:</Label>
                      <Select
                        value={appendData.encodingMode}
                        onValueChange={(value) =>
                          setAppendData({ ...appendData, encodingMode: value })
                        }
                      >
                        <SelectTrigger id="append-encoding-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="numeric">Numeric (0-9)</SelectItem>
                          <SelectItem value="alphanumeric">
                            Alphanumeric (0-9A-Z $%*+-./:)
                          </SelectItem>
                          <SelectItem value="byte">Byte (any characters)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex max-w-sm flex-col gap-1">
                      <Label htmlFor="append-separator-new">Separator:</Label>
                      <Input
                        id="append-separator-new"
                        type="text"
                        value={appendData.separator || ""}
                        onChange={(e) =>
                          setAppendData({ ...appendData, separator: e.target.value })
                        }
                        placeholder="Separator (must match encoding mode)"
                      />
                      <span className="text-xs text-muted-foreground">
                        Separator will be inserted before appended data
                      </span>
                    </div>
                  </>
                )}

                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                  <strong>Auto-calculated:</strong> Append length will be automatically
                  determined based on available QR code capacity. QArt will fill with
                  placeholder data and optimize these bits to match the target image.
                </div>

                {qartResult?.optimizedAppendData && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/40">
                    <div className="mb-2 text-xs font-semibold text-green-800 dark:text-green-200">
                      Optimized Append Data:
                    </div>
                    <div className="break-all font-mono text-sm text-green-900 dark:text-green-100">
                      {qartResult.optimizedAppendData.originalText || "(empty)"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Mode: {qartResult.optimizedAppendData.encodingMode} | Segments:{" "}
                      {qartResult.optimizedAppendData.segments.length}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </SettingsPanel>

        {isGenerating && (
          <p className="text-sm text-muted-foreground">
            {generationProgress
              ? `Generating QArt frame ${generationProgress.current}/${generationProgress.total}…`
              : "QArt generation is running automatically..."}
          </p>
        )}
      </SettingsPanel>
    </>
  );
}

