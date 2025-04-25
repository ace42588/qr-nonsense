//import { getCodewords, getEncoder, getMinimumQRCodeVersion } from "../../domain/qr";
import {
  getCodewords,
  encodeInput,
  getMinimumQRCodeVersion,
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

  return segments;
}

const deriveCodewordsFromSegments = getCodewords;

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
        segments: [...acc.segments, ...curr.segments],
        segmentMap: new Map([...acc.segmentMap, ...curr.segmentMap]),
        bitMap: new Map([...acc.bitMap, ...curr.bitMap]),
      };
    },
    {
      segments: [],
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
    segments,
    calculatedVersion,
    errorCorrectionLevel
  );
  const { matrix, dataMask: calculatedDataMask } = deriveMatrixFromCodewords({
    version: calculatedVersion,
    errorCorrectionLevel,
    dataMask,
    codewords,
  });

  const newQRData = {
    ...qrData,
    segments,
    calculatedVersion,
    codewords,
    matrix,
    calculatedDataMask,
  };

  return { ...state, ...newQRData, ...override };
}
