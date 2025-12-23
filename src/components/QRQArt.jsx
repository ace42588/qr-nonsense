import React, { useState, useCallback, useMemo, useEffect } from "react";
import { QRBase } from "./QRBase";
import { useQRData } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { useQArtResult } from "@/state/qr/QArtContext";
import { Switch } from "@/components/ui/switch";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { rasterizeImageToQRGrid } from "@/domain/image";
import { ErrorBanner, WarningBanner } from "@/components/ui/message-banner";
import { checkVersionCapacityForQArt } from "@/domain/qart/capacity";
import { getNumBits } from "@/domain/qr/encoders/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQArtGeneration } from "@/hooks/useQArtGeneration";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useQRMatrix } from "@/hooks/useQRMatrix";
import { createContrastMatrix } from "@/domain/qart/contrastMatrix";

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
  
  const handleModuleHover = useModuleHover();

  // QArt-specific options
  const [showRasterizedPreview, setShowRasterizedPreview] = useState(false);
  const [showControlView, setShowControlView] = useState(false);
  const [showContrastView, setShowContrastView] = useState(false);
  const [priorityFunction, setPriorityFunction] = useState("contrast"); // Priority function type (FR-007)
  const [capacityWarning, setCapacityWarning] = useState(null); // Version capacity warning (FR-015)
  
  // Append data configuration
  const [appendData, setAppendData] = useState({
    enabled: false,
    method: "existing",
    separator: "",
    encodingMode: "alphanumeric"
  });

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
      appendData: appendData.enabled ? appendData : undefined,
    },
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
  // CRITICAL: Use a stable key based on qartResult, not on visualization toggles
  // This prevents unnecessary remounts that could trigger mutations
  // Visualization changes are handled in renderModule, not by remounting
  const canvasKey = useMemo(() => {
    // Use qartResult matrix length for stability, or a fixed key if no result
    const matrixLength = qartResult?.matrix?.length || matrix?.length || 0;
    return `qart-canvas-${matrixLength}`;
  }, [qartResult?.matrix?.length, matrix?.length]);

  // Render module - QArt uses the generated matrix directly
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
    
    // If contrast view is enabled, show contrast heatmap
    if (showContrastView && contrastMatrix && renderCtx) {
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
        return;
      }
    }

    // If control view is enabled, check the control matrix for visualization data
    if (showControlView && controlMatrix && renderCtx) {
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
        return;
      }
    }
    
    // Default rendering - always use the actual module's isDark value
    ctx.fillStyle = module.isDark ? "black" : "white";
    ctx.fillRect(x, y, size, size);
    
    // Overlay rasterized preview if enabled
    if (showRasterizedPreview && rasterizedGrid && renderCtx) {
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
  }, [showRasterizedPreview, showControlView, showContrastView, rasterizedGrid, matrix, controlMatrix, contrastMatrix]);


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

