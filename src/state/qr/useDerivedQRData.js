import { useMemo } from "react";
import { useInputs } from "../inputs/InputContext";
import { getEncodedMessage, getVersion, getMatrix } from "../../domain/qr";
import { encodeAll } from "../../domain";

export function useDerivedQRData() {
  //console.debug("useDerivedQRData", useInputs());
  const {
    inputs,
    version: selectedVersion,
    dataMask: selectedDataMask,
    errorCorrectionLevel,
  } = useInputs();


  const dataSegments = useMemo(() => encodeAll(inputs), [inputs]);

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
