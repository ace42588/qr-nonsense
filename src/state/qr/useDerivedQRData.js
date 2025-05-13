import { useMemo } from "react";
import { useInputs } from "../inputs/InputContext";
import { useParsedInputs } from "../inputs/useParsedInputs";
import { getEncodedMessage, getCodewords, getMatrix } from "../../domain/qr";

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
  
  const codewords = useMemo(
    () => getCodewords(segments, version, errorCorrectionLevel),
    [parsedInputs, selectedVersion, errorCorrectionLevel]
  );

  const { matrix, dataMask } = useMemo(
    () => getMatrix(codewords, selectedDataMask, version, errorCorrectionLevel),
    [errorCorrectionLevel, version, selectedDataMask, codewords]
  );

  return {
    segments,
    codewords,
    version,
    matrix,
    dataMask,
  };
}
