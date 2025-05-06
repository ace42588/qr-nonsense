import {
  encodeInput,
  finalizeEncoding,
  generateMatrix,
  getBits,
  getCodewords,
  getMinimumQRCodeVersion,
  getRequiredDataCodewords,
} from "../../domain/qr";

export function getSegments(inputs) {
  const segments = inputs.flatMap(({ data, mode, encoding }) =>
    encodeInput(mode, data, { inputEncoding: encoding })
  );
  return segments;
}

export function getVersion(numBits, inputVersion, errorCorrectionLevel) {
  let version = parseInt(inputVersion) || -1;
  if (1 <= version && version <= 40) {
    return version;
  } else if (version == -1) {
    return getMinimumQRCodeVersion(numBits, errorCorrectionLevel);
  }
  throw new Error(`Invalid version: ${inputVersion.toString()}`);
}

export function getMappedBits(segments) {
  const idMap = new Map();
  const bits = segments.flatMap((s) => {
    const bits = getBits(s.value, s.length, s.id);
    idMap.set(s.id, bits.map((b => b.id)));
    bits.forEach((b) => idMap.set(b.id, s.id));
    return bits;
  })
  return { bits, idMap };
}

export function getMatrix(
  errorCorrectionLevel,
  version,
  selectedDataMask,
  bits
) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const finalizedBits = finalizeEncoding(bits, requiredDataCodewords);
  const codewords = getCodewords(finalizedBits, version, errorCorrectionLevel);
  return generateMatrix({
    version,
    errorCorrectionLevel,
    dataMask: selectedDataMask,
    codewords,
  });
}

export function highlightModules(segment, idMap, matrix) {
  console.debug("highlightModules", { segment, idMap, matrix });
  const modulesToUpdate = idMap.get(segment.id);
  const newMatrix = matrix.map((row) =>
    row.map((module) => {
      let { bit, isHighlighted } = module;
      const newModule = { ...module };
      if (bit.id && modulesToUpdate.some((id) => id === bit.id)) {
        newModule.isHighlighted = !isHighlighted;
      }
      return newModule;
    })
  );
  return newMatrix;
}

export function highlightSegment(module, idMap, segments) {
  const segmentToUpdate = idMap.get(module.id);
  //console.debug("highlightSegment", {segmentToUpdate});
  const newSegments = segments.map((segment) => {
    let { id, isHighlighted } = segment;
    const newSegment = { ...segment };
    if (id === segmentToUpdate) newSegment.isHighlighted = !isHighlighted;
    return newSegment;
  });
  return newSegments;
}

const isBinary = (str) =>
  /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(str);
const isHex = (str) =>
  /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(str);

export function parseInput(input) {
  //console.debug("parseInput", { input });
  if (!input || !input.data || !input.mode) return {};
  let { mode, data, encoding } = input;

  const parsedInput = { mode, data, encoding };

  switch (mode) {
    case "numeric": {
      const regex = /\d+/gm;
      const match = data.match(regex);
      parsedInput.data = match ? match.join("") : "";
      break;
    }
    case "alphanumeric": {
      const regex = /[0-9A-Z \$\%\*\+\-\.\/:]+/gm;
      let upperCase = data.toUpperCase();
      const match = upperCase.match(regex);
      parsedInput.data = match ? match.join("") : "";
      break;
    }
    default: {
      // default to byte
      if (encoding === "utf-8") {
        //console.debug("parsedInput", "Forcing UTF-8 interpretation for input");
        break;
      }
      if (isBinary(data)) {
        console.debug("parsedInput", "Interpreting input as binary...");
        let hex = "";
        let bin = data.replace(/^0b/i, "");
        bin = bin.replace(/\s+/g, "");

        for (let i = 0; i < bin.length; i += 4) {
          let val = parseInt(bin.substring(i, i + 4), 2);
          hex = hex.concat(val.toString(16));
        }
        parsedInput.encoding = "hex";
        parsedInput.data = hex;
        break;
      } else if (isHex(data)) {
        console.debug("parsedInput", "Interpreting input as hex...");
        let hex = data.replace(/0x/gi, "");
        hex = hex.replace(/\s+/g, "");

        if (hex.length % 2 !== 0) {
          throw new Error("Invalid hex string: length must be even.");
        }
        parsedInput.encoding = "hex";
        parsedInput.data = hex;
        break;
      } else {
        console.log(
          "input value for byte mode did not match binary or hex encoding"
        );
        parsedInput.encoding = "utf-8";
      }
    }
  }

  //console.debug("parsedInput: returning", parsedInput);

  return parsedInput;
}
