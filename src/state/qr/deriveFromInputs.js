//import { getCodewords, getEncoder, getMinimumQRCodeVersion } from "../../domain/qr";
import {
  encodeInput,
  finalizeEncoding,
  getBits,
  getCodewords,
  getMinimumQRCodeVersion,
  getRequiredDataCodewords,
} from "../../domain/qr";
import { deriveMatrixFromCodewords } from "./deriveMatrixFromCodewords";

function deriveVersionFromInputs(numBits, inputVersion, errorCorrectionLevel) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

function deriveSegmentsFromInputs(inputs) {
  const segments = inputs.flatMap(({ data, mode, encoding }) =>
    encodeInput(mode, data, encoding)
  );
  return segments;
}

function deriveCodewordsFromBits(bits, version, ecLevel) {
  //console.debug("deriveCodewordsFromBits", { bitMap, version, ecLevel });
  const requiredDataCodewords = getRequiredDataCodewords(version, ecLevel);
  const finalizedBits = finalizeEncoding(bits, requiredDataCodewords);
  //console.debug("deriveCodewordsFromBits", { finalizedBits });
  return getCodewords(finalizedBits, version, ecLevel);
}

export function deriveFromInputs(state, override = {}) {
  const {
    inputs = state.inputs,
    errorCorrectionLevel = state.errorCorrectionLevel,
    version = state.version,
    dataMask = state.dataMask,
  } = override;

  try {
    const segments = deriveSegmentsFromInputs(inputs);
    console.debug("deriveFromInputs", {segments});
    const bits = segments.flatMap((s) => getBits(s.value, s.length));

    const calculatedVersion = deriveVersionFromInputs(
      bits.length,
      version,
      errorCorrectionLevel
    );
    const codewords = deriveCodewordsFromBits(
      bits,
      calculatedVersion,
      errorCorrectionLevel
    );
    //console.debug("deriveFromInputs", { codewords });
    const { matrix, dataMask: calculatedDataMask } = deriveMatrixFromCodewords({
      version: calculatedVersion,
      errorCorrectionLevel,
      dataMask,
      codewords,
    });

    console.debug("deriveFromInputs", {
      newQRData
    });

    const newQRData = {
      calculatedVersion,
      matrix,
      calculatedDataMask,
    };

    return { ...state, ...newQRData, ...override };
  } catch (e) {
    console.error(e);
    return state;
  }
}
