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
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useQRMatrix } from "@/hooks/useQRMatrix";
import { createContrastMatrix } from "@/domain/qart/contrastMatrix";
import { useHalftonePatterns } from "@/hooks/useHalftonePatterns";
import {
  renderHalftoneModuleWithAreaSampling,
  clampDotSizes,
  DOT_SIZE_MAX,
} from "@/domain/halftone/rendering";

const DEFAULT_MIN_DOT = 0.25;
const DEFAULT_MAX_DOT = 1.0;

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
    if (!sourceImage) return null;
    return { scale, offsetX, offsetY };
  }, [sourceImage, scale, offsetX, offsetY]);

  // Memoize appendData options to prevent constant regeneration
  const appendDataOptions = useMemo(() => {
    return appendData.enabled ? appendData : undefined;
  }, [appendData]);

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
      priorityFunction,
      appendData: appendDataOptions,
      minDecodeRedundancy: 0.8,
      decodeTrials: 1,
    },
    sourceImage,
    transformParams,
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
    if (!sourceImage || !versionInfo) return { isExtreme: false, warning: null };
    const qrDimension = versionInfo.version * 4 + 17;
    const maxDim = Math.max(sourceImage.width, sourceImage.height);
    if (!maxDim) return { isExtreme: false, warning: null };
    return detectExtremeScaling(qrDimension / maxDim);
  }, [sourceImage, versionInfo]);

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
  const { patternsDark, patternsLight, importanceMap } = useHalftonePatterns({
    transformedImageData: halftoneImageData,
    canvasSize: halftoneImageData?.width || canvasSize, // Pass image width, not canvasSize
    importanceWeight: 0.5,
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
      />
      <div style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
          {combined ? "Combined QArt + Halftone Settings" : "QArt Settings"}
        </h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {!combined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="enable-halftone" style={{ minWidth: 120, color: '#666' }}>
                Enable Halftone:
              </label>
              <Switch
                id="enable-halftone"
                checked={enableHalftone}
                onCheckedChange={setEnableHalftone}
                title="Apply halftone effect after QArt generation completes"
              />
              <span style={{ fontSize: '12px', color: '#666' }}>
                Apply halftone patterns for enhanced visual fidelity
              </span>
            </div>
          )}
          {applyHalftone && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="qart-halftone-style" style={{ minWidth: 120, color: '#666' }}>
                  Style:
                </label>
                <select
                  id="qart-halftone-style"
                  value={halftoneStyle}
                  onChange={(e) => {
                    const next = e.target.value;
                    setHalftoneStyle(next);
                    if (next === "dots") {
                      setMinDotSize(DEFAULT_MIN_DOT);
                      setMaxDotSize(DEFAULT_MAX_DOT);
                    }
                  }}
                  style={{ maxWidth: 200, padding: '4px 8px' }}
                >
                  <option value="pattern">Pattern</option>
                  <option value="dots">Dots</option>
                </select>
              </div>
              {halftoneStyle === "dots" && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label htmlFor="qart-min-dot-size" style={{ minWidth: 120, color: '#666' }}>
                      Min size:
                    </label>
                    <input
                      id="qart-min-dot-size"
                      type="range"
                      min="0"
                      max={DOT_SIZE_MAX}
                      step="0.05"
                      value={minDotSize}
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        setMinDotSize(next);
                        if (next > maxDotSize) setMaxDotSize(next);
                      }}
                      style={{ flex: 1, maxWidth: 200 }}
                    />
                    <span style={{ fontSize: '12px', color: '#666', minWidth: 40 }}>
                      {minDotSize.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label htmlFor="qart-max-dot-size" style={{ minWidth: 120, color: '#666' }}>
                      Max size:
                    </label>
                    <input
                      id="qart-max-dot-size"
                      type="range"
                      min="0"
                      max={DOT_SIZE_MAX}
                      step="0.05"
                      value={maxDotSize}
                      onChange={(e) => {
                        const next = parseFloat(e.target.value);
                        setMaxDotSize(next);
                        if (next < minDotSize) setMinDotSize(next);
                      }}
                      style={{ flex: 1, maxWidth: 200 }}
                    />
                    <span style={{ fontSize: '12px', color: '#666', minWidth: 40 }}>
                      {maxDotSize.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="limit-halftone-important" style={{ minWidth: 120, color: '#666' }}>
                  Limit to Important:
                </label>
                <Switch
                  id="limit-halftone-important"
                  checked={limitHalftoneToImportant}
                  onCheckedChange={setLimitHalftoneToImportant}
                  title="Only apply halftone effect to important areas of the image (edges, details)"
                />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Apply halftone only to important image areas
                </span>
              </div>
              {limitHalftoneToImportant && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 128 }}>
                  <label htmlFor="importance-threshold" style={{ minWidth: 100, color: '#666', fontSize: '12px' }}>
                    Threshold:
                  </label>
                  <input
                    id="importance-threshold"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={importanceThreshold}
                    onChange={(e) => setImportanceThreshold(parseFloat(e.target.value))}
                    style={{ flex: 1, maxWidth: 200 }}
                  />
                  <span style={{ fontSize: '12px', color: '#666', minWidth: 40 }}>
                    {importanceThreshold.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    Lower = more areas get halftone
                  </span>
                </div>
              )}
            </>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="preview-rasterized" style={{ minWidth: 120, color: '#666' }}>
              Preview Rasterized:
            </label>
            <Switch
              id="preview-rasterized"
              checked={showRasterizedPreview}
              onCheckedChange={setShowRasterizedPreview}
              title="Show rasterized target image overlay on QR code for troubleshooting"
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              Overlay target image on QR code
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="show-control" style={{ minWidth: 120, color: '#666' }}>
              Show Control View:
            </label>
            <Switch
              id="show-control"
              checked={showControlView}
              onCheckedChange={setShowControlView}
              title="Show which modules are controllable (black/white = controlled, gray = uncontrolled)"
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              Highlight controllable modules
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="show-contrast" style={{ minWidth: 120, color: '#666' }}>
              Show Contrast Map:
            </label>
            <Switch
              id="show-contrast"
              checked={showContrastView}
              onCheckedChange={setShowContrastView}
              title="Show contrast (variance) heatmap (bright = high contrast, dark = low contrast)"
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              Show contrast heatmap
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ minWidth: 120, color: '#666' }}>Priority Function:</label>
            <div style={{ display: 'flex', gap: 16, flex: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="priorityFunction"
                  value="contrast"
                  checked={priorityFunction === "contrast"}
                  onChange={(e) => setPriorityFunction(e.target.value)}
                />
                <span style={{ fontSize: '14px' }}>Contrast-based</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="priorityFunction"
                  value="random"
                  checked={priorityFunction === "random"}
                  onChange={(e) => setPriorityFunction(e.target.value)}
                />
                <span style={{ fontSize: '14px' }}>Random</span>
              </label>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #ddd', paddingTop: 16, marginTop: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#333', fontSize: '14px', fontWeight: '600' }}>Append Data</h4>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label htmlFor="append-enabled" style={{ minWidth: 120, color: '#666' }}>
                  Enable Append:
                </label>
                <Switch
                  id="append-enabled"
                  checked={appendData.enabled}
                  onCheckedChange={(checked) => setAppendData({ ...appendData, enabled: checked })}
                  title="Append additional data that QArt can optimize (like padding bits) to match the target image"
                />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  Append optimizable data (QArt will modify it to match image)
                </span>
              </div>
              
              {appendData.enabled && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Label htmlFor="append-method" style={{ minWidth: 120, color: '#666' }}>Append Method:</Label>
                    <div style={{ display: 'flex', gap: 16, flex: 1 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="appendMethod"
                          value="existing"
                          checked={appendData.method === "existing"}
                          onChange={(e) => setAppendData({ ...appendData, method: e.target.value })}
                        />
                        <span style={{ fontSize: '14px' }}>Existing Segment</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="appendMethod"
                          value="new"
                          checked={appendData.method === "new"}
                          onChange={(e) => setAppendData({ ...appendData, method: e.target.value })}
                        />
                        <span style={{ fontSize: '14px' }}>New Segment</span>
                      </label>
                    </div>
                  </div>
                  
                  {appendData.method === "existing" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Label htmlFor="append-separator" style={{ color: '#666' }}>Separator:</Label>
                      <Input
                        id="append-separator"
                        type="text"
                        value={appendData.separator}
                        onChange={(e) => setAppendData({ ...appendData, separator: e.target.value })}
                        placeholder="Separator (must match segment encoding mode)"
                        style={{ maxWidth: 300 }}
                      />
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        Separator will be inserted between original data and appended data
                      </span>
                    </div>
                  )}
                  
                  {appendData.method === "new" && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Label htmlFor="append-encoding-mode" style={{ color: '#666' }}>Encoding Mode:</Label>
                        <Select
                          value={appendData.encodingMode}
                          onValueChange={(value) => setAppendData({ ...appendData, encodingMode: value })}
                        >
                          <SelectTrigger id="append-encoding-mode" style={{ maxWidth: 300 }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="numeric">Numeric (0-9)</SelectItem>
                            <SelectItem value="alphanumeric">Alphanumeric (0-9A-Z $%*+-./:)</SelectItem>
                            <SelectItem value="byte">Byte (any characters)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Label htmlFor="append-separator-new" style={{ color: '#666' }}>Separator:</Label>
                        <Input
                          id="append-separator-new"
                          type="text"
                          value={appendData.separator || ""}
                          onChange={(e) => setAppendData({ ...appendData, separator: e.target.value })}
                          placeholder="Separator (must match encoding mode)"
                          style={{ maxWidth: 300 }}
                        />
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          Separator will be inserted before appended data
                        </span>
                      </div>
                    </>
                  )}
                  
                  <div style={{ padding: '8px 12px', backgroundColor: '#e3f2fd', borderRadius: 4, fontSize: '12px', color: '#1976d2' }}>
                    <strong>Auto-calculated:</strong> Append length will be automatically determined based on available QR code capacity. QArt will fill with placeholder data and optimize these bits to match the target image.
                  </div>
                  
                  {qartResult?.optimizedAppendData && (
                    <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: 4, border: '1px solid #c8e6c9' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#2e7d32', marginBottom: 8 }}>
                        Optimized Append Data:
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#1b5e20', wordBreak: 'break-all' }}>
                        {qartResult.optimizedAppendData.originalText || '(empty)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: 4 }}>
                        Mode: {qartResult.optimizedAppendData.encodingMode} | 
                        Segments: {qartResult.optimizedAppendData.segments.length}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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

