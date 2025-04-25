import { CodewordLength, PAD_BYTES } from "./Constants";
import { getBits } from "../bitUtils";

let lastSegmentId = 0;

// ~24k bits possible
function getId() {
  if (lastSegmentId >= 0xffff) lastSegmentId = 0;

  return `segment-${lastSegmentId++}`;
}

export function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
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

export function createCodon(value, text, inputMode, length) {
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

  for (const elem of segment) {
    const bits = getBits(elem);
    segmentMap.set(elem, bits);
    bits.forEach((b) => bitMap.set(b, elem));
  }
  return { bitMap, segmentMap };
}

export function encodeSegment(data, inputMode, codonItrFn) {
  const codons = [...codonItrFn(data)];
  const mode = createModeIndicator(inputMode);
  const characterCount = createCharacterCountIndicator(data, codons, inputMode);
  const segment = { mode, characterCount, ...codons };

  const { bitMap, segmentMap } = createMaps(segment);
  const bits = [...bitMap.keys()];

  const encoded = {
    mode,
    characterCount,
    segmentMap,
    bitMap,
  };
  return encoded;
}

export function* createNonByte(input, mode, encoderFn) {
  const groups = input.match(mode.groupingRegex);
  if (!groups) {
    throw new Error(`Invalid input for ${mode.name} encoder: ${input}`);
  }
  for (let i = 0; i < groups.length; i++) {
    //yield new SegmentClass(groups[i], i, parentId);
    const { value, length } = encoderFn(groups[i]);
    yield createCodon(value, groups[i], mode.name, length);
  }
}

export function finalizeEncoding(segments, requiredDataCodewords) {
  let bits = segments.flatMap(({ bitMap }) => [...bitMap.keys]);
  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, bits.length);
  const termBits = getBits(0, numTermBits);
  bits = [...bits, ...termBits];

  // add filler bits to complete the last codeword
  const remainder = bits.length % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  const fillBits = getBits(0, numFillBits);
  bits = [...bits, ...fillBits];

  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(bits.length / CodewordLength);
  const padBytes = Array.from({ length: numPadBytes }, (_, i) =>
    getBits(PAD_BYTES[i % 2], 8)
  );

  return [...bits, ...padBytes.flat()];
}
