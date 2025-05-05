import {
  encodeInput,
  finalizeEncoding,
  generateMatrix,
  getBits,
  getCodewords,
  getMinimumQRCodeVersion,
  getRequiredDataCodewords,
} from "../../domain/qr";

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
    encodeInput(mode, data, {inputEncoding: encoding})
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
    const idMap = new Map();
    const bits = segments.flatMap((s) => {
      const bits = getBits(s.value, s.length);
      idMap.set(
        s.id,
        bits.map((b) => b.id)
      );
      bits.forEach((b) => idMap.set(b.id, s.id));
      return bits;
    });

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

    const { matrix, dataMask: calculatedDataMask } = generateMatrix({
      version: calculatedVersion,
      errorCorrectionLevel,
      dataMask,
      codewords,
    });

    const newQRData = {
      segments,
      calculatedVersion,
      matrix,
      calculatedDataMask,
      idMap
    };

    return { ...state, ...newQRData, ...override };
  } catch (e) {
    console.error(e);
    return state;
  }
}
