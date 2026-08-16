import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { QRBase } from "./QRBase";
import { useQRData } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { useQArtResult } from "@/state/qr/QArtContext";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { detectExtremeScaling } from "@/domain/image";
import { ErrorBanner, WarningBanner } from "@/components/ui/message-banner";
import { checkVersionCapacityForQArt } from "@/domain/qart/capacity";
import { getNumBits } from "@/domain/qr/encoders/utils";
import { useIsqrGeneration } from "@/hooks/useIsqrGeneration";
import { useCanvasSizeSync } from "@/hooks/useCanvasSizeSync";
import { useQRMatrix } from "@/hooks/useQRMatrix";
import { SettingsPanel } from "@/components/qr-controls/SettingsPanel";
import { IsqrControls } from "@/components/qr-controls/IsqrControls";

export function QRISQR({ size: initialSize = 480, modulePixel = 3 }) {
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

  useEffect(() => {
    return () => {
      setQartResult(null);
    };
  }, [setQartResult]);

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

  const [roiThresholdBias, setRoiThresholdBias] = useState(0);
  const [csfStrength, setCsfStrength] = useState(0.5);
  const [printDpi, setPrintDpi] = useState(300);
  const [viewingDistanceInches, setViewingDistanceInches] = useState(12);
  const [qrBlend, setQrBlend] = useState(0.55);
  const [showRoi, setShowRoi] = useState(false);
  const [maskImage, setMaskImage] = useState(null);
  const [capacityWarning, setCapacityWarning] = useState(null);

  const transformParams = useMemo(
    () => ({ scale, offsetX, offsetY }),
    [scale, offsetX, offsetY]
  );

  const extremeScaling = useMemo(() => {
    if (!scale) return null;
    return detectExtremeScaling(scale);
  }, [scale]);

  const userInputBits = useMemo(() => {
    if (!segments) return 0;
    const dataSegs = segments.filter(
      (s) => s.type !== "padding" && s.type !== "terminator" && s.type !== "fill"
    );
    return getNumBits(dataSegs);
  }, [segments]);

  useEffect(() => {
    if (!transformedImageData || !versionInfo) {
      setCapacityWarning(null);
      return;
    }
    const capacityCheck = checkVersionCapacityForQArt(
      versionInfo,
      userInputBits,
      transformedImageData
    );
    if (!capacityCheck.hasCapacity) {
      setCapacityWarning(
        capacityCheck.warning || "Insufficient capacity for IS-QR generation"
      );
    } else {
      setCapacityWarning(null);
    }
  }, [
    transformedImageData,
    versionInfo,
    userInputBits,
  ]);

  const { isGenerating, generationError, isqrResult } = useIsqrGeneration({
    segments,
    codewords,
    blocks,
    contextMatrix,
    versionInfo,
    errorCorrectionLevel,
    transformedImageData,
    isLoadingTransform,
    setQartResult,
    sourceImage,
    transformParams,
    options: {
      roiThresholdBias,
      modulePixel,
      csfStrength,
      printDpi,
      viewingDistanceInches,
      qrBlend,
      maskImage,
    },
  });

  const matrix = useQRMatrix({
    qartResult,
    contextMatrix,
  });

  const fusedCanvasRef = useRef(null);
  useEffect(() => {
    const fused = isqrResult?.fusedImage;
    if (!fused) {
      fusedCanvasRef.current = null;
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = fused.width;
    canvas.height = fused.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(fused, 0, 0);
      fusedCanvasRef.current = canvas;
    }
  }, [isqrResult?.fusedImage]);

  const canvasKey = useMemo(() => {
    const matrixLength = qartResult?.matrix?.length || matrix?.length || 0;
    return `isqr-canvas-${matrixLength}-${isqrResult?.fusedImage?.width || 0}`;
  }, [qartResult?.matrix?.length, matrix?.length, isqrResult?.fusedImage?.width]);

  const renderModule = useCallback(
    (ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
      if (!module) return;
      ctx.imageSmoothingEnabled = false;
      const x = moduleX;
      const y = moduleY;
      const width = renderCtx?.moduleWidth ?? moduleSize;
      const height = renderCtx?.moduleHeight ?? moduleSize;
      const size = width === height ? width : Math.max(width, height);
      const mx = renderCtx?.x ?? 0;
      const my = renderCtx?.y ?? 0;
      const fusedCanvas = fusedCanvasRef.current;
      const roiGrid = isqrResult?.roiGrid;

      if (fusedCanvas && renderCtx) {
        const mp = modulePixel;
        ctx.drawImage(
          fusedCanvas,
          mx * mp,
          my * mp,
          mp,
          mp,
          x,
          y,
          size,
          size
        );
      } else {
        ctx.fillStyle = module.isDark ? "black" : "white";
        ctx.fillRect(x, y, size, size);
      }

      if (showRoi && roiGrid && renderCtx) {
        const dimension = matrix?.length || 0;
        if (dimension > 0) {
          const roi = roiGrid[my * dimension + mx] ?? 0;
          if (roi > 0.15) {
            ctx.save();
            ctx.globalAlpha = 0.25 * roi;
            ctx.fillStyle = "rgb(0, 180, 80)";
            ctx.fillRect(x, y, size, size);
            ctx.restore();
          }
        }
      }
    },
    [isqrResult?.roiGrid, modulePixel, showRoi, matrix?.length]
  );

  const handleBaseRender = useCanvasSizeSync({
    canvasSize,
    setCanvasSize,
    renderModule,
  });

  const handleMaskFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const side = Math.max(img.width, img.height);
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, side, side);
      const ox = (side - img.width) / 2;
      const oy = (side - img.height) / 2;
      ctx.drawImage(img, ox, oy);
      setMaskImage(ctx.getImageData(0, 0, side, side));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  return (
    <>
      {transformError && <ErrorBanner message={transformError} title="Image Error" />}
      {extremeScaling?.isExtreme && extremeScaling.warning && (
        <WarningBanner message={extremeScaling.warning} title="Image scaling" />
      )}
      {capacityWarning && (
        <WarningBanner message={capacityWarning} title="Capacity Warning" />
      )}
      {qartResult?.scannabilityWarning && (
        <WarningBanner
          message={qartResult.scannabilityWarning}
          title="Scannability"
        />
      )}
      {generationError && <ErrorBanner message={generationError} />}
      {!sourceImage && (
        <WarningBanner
          message="Upload an image in the sidebar to generate an IS-QR code."
          title="Image required"
        />
      )}
      <QRBase
        key={canvasKey}
        size={initialSize}
        renderModule={handleBaseRender}
        onModuleHover={handleModuleHover}
        responsive={true}
        customMatrix={matrix}
      />
      <SettingsPanel title="IS-QR Settings">
        <IsqrControls
          roiThresholdBias={roiThresholdBias}
          onRoiThresholdBiasChange={setRoiThresholdBias}
          csfStrength={csfStrength}
          onCsfStrengthChange={setCsfStrength}
          printDpi={printDpi}
          onPrintDpiChange={setPrintDpi}
          viewingDistanceInches={viewingDistanceInches}
          onViewingDistanceChange={setViewingDistanceInches}
          qrBlend={qrBlend}
          onQrBlendChange={setQrBlend}
          showRoi={showRoi}
          onShowRoiChange={setShowRoi}
          onMaskFileChange={handleMaskFileChange}
          hasMask={!!maskImage}
          onClearMask={() => setMaskImage(null)}
          metrics={isqrResult?.metrics}
          instanceCount={isqrResult?.instanceCount}
          decodeSuccessRate={isqrResult?.qart?.decodeSuccessRate}
          evaluation={isqrResult?.qart?.evaluation}
        />
        {isGenerating && (
          <p className="text-sm text-muted-foreground">
            IS-QR generation is running…
          </p>
        )}
      </SettingsPanel>
    </>
  );
}
