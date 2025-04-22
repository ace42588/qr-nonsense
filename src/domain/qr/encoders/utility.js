import { MODE, AlphaNumCharMap, CodewordLength, PAD_BYTES } from "./Constants";
import { getBits } from "./BitUtils";

let lastSegmentId = 0;

// ~24k bits possible
function getId() {
  if (lastSegmentId >= 0xffff) lastSegmentId = 0;

  return `segment-${lastSegmentId++}`;
}

function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
}

function makeSegment(value, text, inputMode) {
  return {
    type: "segment",
    id: getId(),
    value,
    text,
    inputMode,
    isHighlighted: false,
    length: 8,
  };
}

function computeIndicatorLength(charCount, mode) {
  if (!mode.thresholds) {
    throw new Error(
      `Mode ${mode.toString()} does not support a character count indicator.`
    );
  }
  const { thresholds } = mode;
  for (const { max, length } of thresholds) {
    if (charCount < max) return length;
  }
  return thresholds[thresholds.length - 1].length;
}

function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}

function createCodon(value, text, inputMode, length) {
  return {
    type: "codon",
    value,
    text,
    inputMode,
    length: length || 8,
  };
}

function createModeIndicator(mode) {
  return {
    type: "modeIndicator",
    value: mode.bits,
    text: mode.name,
    length: 4,
  };
}

function createCharacterCountIndicator(data, codons, mode) {
  return {
    type: "characterCountIndicator",
      value: data.length,
      text: data.length,
      length: computeIndicatorLength(codons.length, mode),
    };
}

function createMaps(segment) {
  
  const bitMap = new Map();
  const segmentMap = new Map();
  const segmentBits = [];
  
  for (const elem of segment) {
    const bits = getBits(elem);
    
  }
  
  const modeBits = getBits(mode.value, mode.length);
  const charCountBits = getBits(characterCount.value, characterCount.length);
  const codonBits = codons.map((c) => getBits(c.value, c.length));
  
}

function encodeSegment(data, inputMode, codons) {
    const mode = createModeIndicator(inputMode);
    const characterCount = createCharacterCountIndicator(data, codons, inputMode);
    const segment = { mode, characterCount, ...codons};


    const modeBits = getBits(mode.value, mode.length);
    modeBits.forEach(({ id }) => bitMap.set(id, mode));
    //mode.bitIds = modeBits.map(({ id }) => id);
    const charCountBits = getBits(characterCount.value, characterCount.length);
    charCountBits.forEach(({ id }) => bitMap.set(id, characterCount));
    //characterCount.bitIds = charCountBits.map(({ id }) => id);
    const segmentBits = segments.flatMap((segment) => {
      const bits = getBits(segment.value, segment.length);
      segmentMap.set(segment.id, bits.map(({id}) => id));
      bits.forEach(({ id }) => bitMap.set(id, segment));
      return bits;
    });
    const bits = [...segmentBits];
    //mode.bitIds = modeBits.map(({ id }) => id);
    //characterCount.bitIds = charCountBits.map(({ id }) => id);
    //segments.bitIds = segmentBits.map(({ id }) => id);

    const encoded = {
      mode,
      characterCount,
      segments,
      segmentMap,
      bits,
      bitMap,
    };
    return encoded;
  }


export function finalizeEncoding(encodedInputs, requiredDataCodewords) {
  //console.debug("finalizeEncoding", { encodedInputs });
  let bits = encodedInputs.flatMap(({ bits }) => bits);
  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, bits.length);
  const termBits = getBits(0, numTermBits);
  bits = [...bits, ...termBits];
  //console.debug("finalizeEncoding", { termBits, bits });
  // add filler bits to complete the last codeword
  const remainder = bits.length % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  const fillBits = getBits(0, numFillBits);
  bits = [...bits, ...fillBits];
  //console.debug("finalizeEncoding", { remainder, numFillBits, fillBits, bits });
  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(bits.length / CodewordLength);
  const padBytes = Array.from({ length: numPadBytes }, (_, i) => {
    const byte = PAD_BYTES[i % 2];
    return getBits(byte, 8);
  });
  bits = [...bits, ...padBytes.flat()];
  //console.debug("finalizeEncoding", { padBytes, bits });
  return bits;
}