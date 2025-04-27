//import { getCodewords, getEncoder, getMinimumQRCodeVersion } from "../../domain/qr";
import {
  getCodewords,
  encodeInput,
  finalizeEncoding,
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
  const segments = inputs.map(({ data, mode, encoding }) =>
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
    const qrData = segments.reduce(
      (acc, curr) => {
        return {
          segments: [...acc.segments, ...curr.segment],
          bits: [...acc.bits, ...curr.bits],
        };
      },
      {
        segments: [],
        bits: [],
      }
    );

    const calculatedVersion = deriveVersionFromInputs(
      qrData.bits.length,
      version,
      errorCorrectionLevel
    );
    const codewords = deriveCodewordsFromBits(
      qrData.bits,
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
      ...qrData,
      calculatedVersion,
      codewords,
      calculatedDataMask,
    });

    const newQRData = {
      ...qrData,
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
