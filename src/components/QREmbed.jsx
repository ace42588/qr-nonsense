import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useEmbedGeneration } from "@/hooks/useEmbedGeneration";
import { SettingsPanel } from "@/components/qr-controls/SettingsPanel";
import { EmbedControls } from "@/components/qr-controls/EmbedControls";
import { ErrorBanner, WarningBanner } from "@/components/ui/message-banner";

export function QREmbed({ size = 480 }) {
  const [centerSeed, setCenterSeed] = useState(0.35);
  const [polarityStrength, setPolarityStrength] = useState(0.9);
  const [csfStrength, setCsfStrength] = useState(0.5);

  const {
    matrixA,
    matrixB,
    errorA,
    errorB,
    invalidReasonA,
    invalidReasonB,
    version,
    dataMask,
    fusedImage,
    modulePixel,
  } = useEmbedGeneration({
    centerSeed,
    polarityStrength,
    csf: { strength: csfStrength },
  });
  const handleModuleHover = useModuleHover();

  const fusedCanvasRef = useRef(null);
  useEffect(() => {
    if (!fusedImage) {
      fusedCanvasRef.current = null;
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = fusedImage.width;
    canvas.height = fusedImage.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(fusedImage, 0, 0);
      fusedCanvasRef.current = canvas;
    }
  }, [fusedImage]);

  const canvasKey = useMemo(() => {
    return `embed-${matrixA?.length || 0}-${fusedImage?.width || 0}-${centerSeed}-${csfStrength}`;
  }, [matrixA?.length, fusedImage?.width, centerSeed, csfStrength]);

  const renderModule = useCallback(
    (ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
      if (!module) return;
      ctx.imageSmoothingEnabled = false;
      const width = renderCtx?.moduleWidth ?? moduleSize;
      const height = renderCtx?.moduleHeight ?? moduleSize;
      const drawSize = width === height ? width : Math.max(width, height);
      const mx = renderCtx?.x ?? module.x ?? 0;
      const my = renderCtx?.y ?? module.y ?? 0;
      const fusedCanvas = fusedCanvasRef.current;
      const mp = modulePixel || 9;

      if (fusedCanvas && matrixB) {
        ctx.drawImage(
          fusedCanvas,
          mx * mp,
          my * mp,
          mp,
          mp,
          moduleX,
          moduleY,
          drawSize,
          drawSize
        );
        return;
      }

      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, drawSize, drawSize);
    },
    [matrixB, modulePixel]
  );

  const hasPair = Boolean(matrixA?.length && matrixB?.length);

  return (
    <>
      {!hasPair && (
        <WarningBanner
          title="Dual payloads required"
          message="Enter valid inputs for Payload A and Payload B (use the A/B toggle in the sidebar)."
        />
      )}
      {errorA && <ErrorBanner title="Payload A" message={errorA} />}
      {errorB && <ErrorBanner title="Payload B" message={errorB} />}
      {invalidReasonA && (
        <WarningBanner title="Payload A capacity" message={invalidReasonA} />
      )}
      {invalidReasonB && (
        <WarningBanner title="Payload B capacity" message={invalidReasonB} />
      )}
      <QRBase
        key={canvasKey}
        size={size}
        customMatrix={matrixA}
        renderModule={renderModule}
        onModuleHover={handleModuleHover}
        responsive
      />
      <SettingsPanel title="Embed Settings">
        <EmbedControls
          version={version}
          dataMask={dataMask}
          errorA={errorA}
          errorB={errorB}
          centerSeed={centerSeed}
          onCenterSeedChange={setCenterSeed}
          csfStrength={csfStrength}
          onCsfStrengthChange={setCsfStrength}
          polarityStrength={polarityStrength}
          onPolarityStrengthChange={setPolarityStrength}
        />
      </SettingsPanel>
    </>
  );
}
