import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { QRBase } from "./QRBase";
import { useQRData } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { generateQArt } from "@/domain/qart";
import { useQArtResult } from "@/state/qr/QArtContext";
import { Switch } from "@/components/ui/switch";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { rasterizeImageToQRGrid } from "@/domain/image";
import { ErrorBanner, LoadingBanner, WarningBanner } from "@/components/ui/message-banner";
import { ImageTransformControls } from "@/components/ui/image-transform-controls";
import { checkVersionCapacityForQArt } from "@/domain/qart/capacity";
import { getNumBits } from "@/domain/qr/encoders/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function QRQArt({
  size: initialSize = 480,
}) {
  const { 
    matrix: contextMatrix,
    segments,
    codewords,
    blocks,
    versionInfo,
  } = useQRData();
  const { formatInfo } = useInputs();
  const { qartResult, setQartResult } = useQArtResult();
  
  const errorCorrectionLevel = formatInfo.errorCorrectionLevel;
  
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
  } = useImageTransform();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const searchControllerRef = useRef(null);
  
  const handleModuleHover = useModuleHover();

  // QArt-specific options
  const [showRasterizedPreview, setShowRasterizedPreview] = useState(false);
  const [showControlView, setShowControlView] = useState(false);
  const [priorityFunction, setPriorityFunction] = useState("contrast"); // Priority function type (FR-007)
  const [capacityWarning, setCapacityWarning] = useState(null); // Version capacity warning (FR-015)
  
  // Append data configuration
  const [appendData, setAppendData] = useState({
    enabled: false,
    method: "existing",
    separator: "",
    encodingMode: "alphanumeric"
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

  // Update capacity warning when check changes (FR-015)
  useEffect(() => {
    if (capacityCheck && !capacityCheck.hasCapacity) {
      setCapacityWarning(capacityCheck.warning || "Insufficient capacity for QArt generation");
    } else {
      setCapacityWarning(null);
    }
  }, [capacityCheck, setCapacityWarning]);

  // Generate QArt QR code - automatically triggered by state changes
  const generateQArtCode = useCallback(async () => {
    // Image requirement validation (FR-002)
    if (!transformedImageData) {
      setGenerationError("No image loaded. Please upload an image to generate QArt QR codes.");
      setQartResult(null);
      return;
    }

    if (!segments || segments.length === 0) {
      setGenerationError("No segments available. Please add an input in the left panel.");
      setQartResult(null);
      return;
    }

    // Check version capacity before generation (FR-014)
    // Note: Warning is displayed separately, but we can still attempt generation
    // The generation may fail if capacity is truly insufficient

    // Cancel any ongoing generation (FR-018, FR-019, FR-020)
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }

    // Create new AbortController for this generation (FR-021)
    const abortController = new AbortController();
    searchControllerRef.current = abortController;

    setIsGenerating(true);
    setGenerationError(null);
    setQartResult(null);

    try {
      const result = await generateQArt({
        segments,
        codewords,
        blocks,
        initialMatrix: contextMatrix,
        versionInfo,
        errorCorrectionLevel,
        targetImage: transformedImageData,
        signal: abortController.signal, // Pass signal for cancellation (FR-021)
        priorityFunction, // Pass priority function type (FR-007)
        appendData: appendData.enabled ? appendData : undefined,
      });

      // Only update state if not cancelled
      if (!abortController.signal.aborted && result) {
        setQartResult(result);
        setGenerationError(null);
        // Don't update context segments here - it causes infinite loop
        // Cards will use QArt result segments when available (see SymbolCard, etc.)
      }
    } catch (err) {
      // Don't set error if cancellation was intentional
      if (err instanceof Error && err.message.includes("cancelled")) {
        // Cancellation is expected, don't show error
        return;
      }
      console.error("Error generating QArt:", err);
      setGenerationError(err instanceof Error ? err.message : "Failed to generate QArt QR code");
    } finally {
      // Only clear generating state if this is still the current generation
      if (searchControllerRef.current === abortController) {
        setIsGenerating(false);
      }
    }
  }, [transformedImageData, segments, codewords, blocks, contextMatrix, errorCorrectionLevel, versionInfo, priorityFunction, appendData, setQartResult]);

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
  }, [transformedImageData, segments, codewords, blocks, contextMatrix, versionInfo, errorCorrectionLevel, priorityFunction, appendData, isLoadingTransform, generateQArtCode]);

  // Get matrix from QArt result or fallback to regular QR
  // Use control matrix if control view is enabled
  const matrix = useMemo(() => {
    if (showControlView && qartResult?.controlMatrix) {
      return qartResult.controlMatrix;
    }
    if (qartResult?.matrix) {
      return qartResult.matrix;
    }
    // For preview, we can show overlay even on regular QR
    // Use the context matrix if available
    return contextMatrix || null;
  }, [qartResult, contextMatrix, showControlView]);

  // Compute rasterized target grid for preview
  // Use qartResult matrix dimension, not display matrix (which changes with showControlView)
  const rasterizedGrid = useMemo(() => {
    if (!transformedImageData) {
      return null;
    }
    // Use qartResult matrix for dimension, or fallback to contextMatrix
    // This ensures rasterization doesn't change when UI controls change
    const sourceMatrix = qartResult?.matrix || contextMatrix;
    if (!sourceMatrix) {
      return null;
    }
    const dimension = sourceMatrix.length;
    try {
      const grid = rasterizeImageToQRGrid(transformedImageData, dimension);
      return grid;
    } catch (err) {
      console.error("QRQArt: Error rasterizing image", err);
      return null;
    }
  }, [transformedImageData, qartResult?.matrix, contextMatrix]);

  // Force canvas redraw when preview toggle changes
  const canvasKey = useMemo(() => {
    return `qart-canvas-${showRasterizedPreview ? 'preview' : 'normal'}-${showControlView ? 'control' : 'normal'}-${matrix ? matrix.length : 0}`;
  }, [showRasterizedPreview, showControlView, matrix]);

  // Render module - QArt uses the generated matrix directly
  const renderModule = useCallback((ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
    if (!module) return;
    
    // If control view and module has gray value, render as gray
    if (showControlView && module._controlGray !== undefined) {
      const gray = module._controlGray;
      const r = (gray >> 16) & 0xff;
      const g = (gray >> 8) & 0xff;
      const b = gray & 0xff;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
      return;
    }
    
    // Default rendering
    ctx.fillStyle = module.isDark ? "black" : "white";
    ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
    
    // Overlay rasterized preview if enabled
    if (showRasterizedPreview && rasterizedGrid && renderCtx) {
      // renderCtx has x, y properties from QRBase
      const { x, y } = renderCtx;
      // Get dimension from renderCtx or matrix
      const dimension = renderCtx.dimension || (matrix ? matrix.length : 0);
      if (dimension > 0 && x >= 0 && y >= 0 && x < dimension && y < dimension) {
        const gridIndex = y * dimension + x;
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
          ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
          ctx.restore();
        }
      }
    }
  }, [showRasterizedPreview, showControlView, rasterizedGrid, matrix]);


  // Listen for canvas size changes from QRBase
  const handleBaseRender = useCallback((ctx, m, moduleX, moduleY, moduleSize, renderCtx) => {
    if (canvasSize !== renderCtx.size) setCanvasSize(renderCtx.size);
    // Add dimension to renderCtx for preview overlay
    const enhancedRenderCtx = {
      ...renderCtx,
      dimension: matrix ? matrix.length : renderCtx.dimension,
    };
    renderModule(ctx, m, moduleX, moduleY, moduleSize, enhancedRenderCtx);
  }, [canvasSize, setCanvasSize, renderModule, matrix]);

  return (
    <>
      {transformError && <ErrorBanner message={transformError} title="Image Error" />}
      {isLoadingTransform && <LoadingBanner message="Loading image..." />}
      {capacityWarning && <WarningBanner message={capacityWarning} title="Capacity Warning" />}
      {generationError && <ErrorBanner message={generationError} />}
      <QRBase
        key={canvasKey}
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
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>QArt Settings</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <ImageTransformControls />
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

