import { useMemo } from "react";
import { getSegments, getMappedBits, getVersion, getMatrix } from "./utils";

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
  inputs,
  version: selectedVersion,
  dataMask: selectedDataMask,
  errorCorrectionLevel,
}) {
  const segments = useMemo(() => getSegments(inputs), [inputs]);

  const {bits, idMap} = useMemo(
    () => getMappedBits(segments),
    [segments]
  );

  const version = useMemo(
    () => getVersion(segments.reduce((total, s) => total + s.length, 0), selectedVersion, errorCorrectionLevel),
    [segments, selectedVersion, errorCorrectionLevel]
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
