import React, { useCallback, useState } from "react";
import { QRBase } from "./QRBase";
import { useModuleHover } from "@/hooks/useModuleHover";
import { useAmbiguousGeneration } from "@/hooks/useAmbiguousGeneration";
import { renderAmbiguousModule } from "@/domain/ambiguous";
import { SettingsPanel } from "@/components/qr-controls/SettingsPanel";
import { AmbiguousControls } from "@/components/qr-controls/AmbiguousControls";
import { ErrorBanner, WarningBanner } from "@/components/ui/message-banner";

export function QRAmbiguous({ size = 480 }) {
  const [phaseFlip, setPhaseFlip] = useState(false);
  const {
    matrixA,
    matrixB,
    errorA,
    errorB,
    invalidReasonA,
    invalidReasonB,
    stats,
    version,
    dataMask,
  } = useAmbiguousGeneration(phaseFlip);
  const handleModuleHover = useModuleHover();

  const renderModule = useCallback(
    (ctx, module, moduleX, moduleY, moduleSize, renderCtx) => {
      if (!module || !matrixB) {
        ctx.fillStyle = module?.isDark ? "black" : "white";
        ctx.fillRect(
          moduleX,
          moduleY,
          renderCtx?.moduleWidth ?? moduleSize,
          renderCtx?.moduleHeight ?? moduleSize
        );
        return;
      }
      const x = renderCtx?.x ?? module.x;
      const y = renderCtx?.y ?? module.y;
      const other = matrixB[y]?.[x];
      const width = renderCtx?.moduleWidth ?? moduleSize;
      const height = renderCtx?.moduleHeight ?? moduleSize;
      renderAmbiguousModule(
        ctx,
        !!module.isDark,
        !!other?.isDark,
        moduleX,
        moduleY,
        width,
        height,
        phaseFlip
      );
    },
    [matrixB, phaseFlip]
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
        size={size}
        customMatrix={matrixA}
        renderModule={renderModule}
        onModuleHover={handleModuleHover}
        responsive
      />
      <SettingsPanel title="Ambiguous Settings">
        <AmbiguousControls
          phaseFlip={phaseFlip}
          onPhaseFlipChange={setPhaseFlip}
          agreeCount={stats?.agreeCount}
          disagreeCount={stats?.disagreeCount}
          version={version}
          dataMask={dataMask}
          errorA={errorA}
          errorB={errorB}
        />
      </SettingsPanel>
    </>
  );
}
