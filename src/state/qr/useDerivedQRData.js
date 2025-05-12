import { useMemo } from "react";
import { useQRData } from "./QRDataContext";

import { getEncodedMessage, getVersion, getMatrix } from "../../domain/qr";
import { useEncodedInputs } from "../../state";

export function useDerivedQRData({
    version: selectedVersion,
    dataMask: selectedDataMask,
    errorCorrectionLevel,
  }) {

  const dataSegments = useEncodedInputs();

  const version = useMemo(
    () =>
      getVersion(
        dataSegments.reduce((total, s) => total + s.length, 0),
        selectedVersion,
        errorCorrectionLevel
      ),
    [dataSegments, selectedVersion, errorCorrectionLevel]
  );

  const { segments, bits } = useMemo(
    () => getEncodedMessage(dataSegments, version, errorCorrectionLevel),
    [dataSegments, version, errorCorrectionLevel]
  );

  const { matrix, dataMask } = useMemo(
    () => getMatrix(errorCorrectionLevel, version, selectedDataMask, bits),
    [errorCorrectionLevel, version, selectedDataMask, bits]
  );

  return {
    segments,
    bits,
    version,
    matrix,
    dataMask,
  };
}
