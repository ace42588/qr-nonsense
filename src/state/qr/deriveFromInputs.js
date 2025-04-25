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
    //  getEncoder(mode).encode(data, encoding)
    encodeInput(mode, data, encoding)
  );
  //console.debug("deriveSegmentsFromInputs", { segments });
  return segments;
}

function deriveCodewordsFromSegments(bitMap, version, ecLevel) {
  //console.debug("deriveCodewordsFromSegments", { bitMap, version, ecLevel });
  const requiredDataCodewords = getRequiredDataCodewords(version, ecLevel);
  const finalizedBits = finalizeEncoding(
    [...bitMap.keys()],
    requiredDataCodewords
  );
  //console.debug("deriveCodewordsFromSegments", { finalizedBits });
  return getCodewords(finalizedBits, version, ecLevel);
}

export function deriveFromInputs(state, override = {}) {
  const {
    inputs = state.inputs,
    errorCorrectionLevel = state.errorCorrectionLevel,
    version = state.version,
    dataMask = state.dataMask,
  } = override;

  const segments = deriveSegmentsFromInputs(inputs);
  const qrData = segments.reduce(
    (acc, curr) => {
      return {
        segmentMap: new Map([...acc.segmentMap, ...curr.segmentMap]),
        bitMap: new Map([...acc.bitMap, ...curr.bitMap]),
      };
    },
    {
      segmentMap: [],
      bitMap: [],
    }
  );

  const calculatedVersion = deriveVersionFromInputs(
    qrData.bitMap.size,
    version,
    errorCorrectionLevel
  );
  const codewords = deriveCodewordsFromSegments(
    qrData.bitMap,
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
    calculatedDataMask
  });

  const newQRData = {
    ...qrData,
    segments: [...qrData.segmentMap.keys()],
    calculatedVersion,
    matrix,
    calculatedDataMask,
  };

  return { ...state, ...newQRData, ...override };
}
