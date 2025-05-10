import { useMemo } from "react";
import {
  getEncodedMessage,
  getVersion,
  getMatrix,
} from "../../domain/qr";
import { useEncodedInputs, useParsedInputs } from "../../state";

/**
 * Derives intermediate and final QR code data from reducer state inputs.
 *
 * @param {Object} state - The reducer state
 * @param {Array} state.inputs - Parsed inputs
 * @param {number} state.version - Selected version or -1 for auto
 * @param {number} state.dataMask - Selected data mask or -1 for auto
 * @param {number} state.errorCorrectionLevel - Level 0 (L) to 3 (H)
 *
 * @returns {{
 *   segments: Array,
 *   bits: Array,
 *   version: number,
 *   matrix: 2D array of QR modules,
 *   dataMask: number,
 * }}
 */
export function useDerivedQRData({
  version: selectedVersion,
  dataMask: selectedDataMask,
  errorCorrectionLevel,
}) {
  //const dataSegments = useMemo(() => getSegments(inputs), [inputs]);
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

  const { segments, bits, idMap } = useMemo(
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
    idMap,
    version,
    matrix,
    dataMask,
  };
}
