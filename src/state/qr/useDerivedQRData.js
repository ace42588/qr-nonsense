import { useMemo } from "react";
import { useInputs } from "../inputs/InputContext";
import { useParsedInputs } from "../inputs/useParsedInputs";
import { getEncodedMessage, getMatrix } from "../../domain/qr";
import { encodeAll } from "../../domain";

export function useDerivedQRData() {
  //console.debug("useDerivedQRData", useInputs());
  const {
    version: selectedVersion,
    dataMask: selectedDataMask,
    errorCorrectionLevel,
  } = useInputs();
  const parsedInputs = useParsedInputs();

  const { segments, version } = useMemo(
    () => getEncodedMessage(parsedInputs, selectedVersion, errorCorrectionLevel),
    [parsedInputs, selectedVersion, errorCorrectionLevel]
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
