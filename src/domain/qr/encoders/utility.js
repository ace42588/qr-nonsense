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

export function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}

function createPart(value,)

export function createCodon(value, text, inputMode, length) {
  return {
    type: "codon",
    value,
    text,
    inputMode,
    length,
    id: getId()
  };
}

function createModeIndicator(mode) {
  return {
    type: "modeIndicator",
    value: mode.bits,
    text: mode.name,
    length: 4,
    id: getId()
  };
}

function createCharacterCountIndicator(data, codons, mode) {
  return {
    type: "characterCountIndicator",
    value: data.length,
    text: data.length,
    length: computeIndicatorLength(codons.length, mode),
    id: getId()
  };
}

function createMaps(segment) {
  const bitMap = new Map();
  const segmentMap = new Map();

  for (const elem of segment) {
    const bits = getBits(elem.value, elem.length);
    segmentMap.set(elem, bits);
    bits.forEach((b) => bitMap.set(b, elem));
  }
  return { bitMap, segmentMap };
}

export function encodeSegment(data, inputMode, codonItrFn) {
  //console.debug("encodeSegment", { data, inputMode, codonItrFn });
  const codons = [...codonItrFn(data)];
  const mode = createModeIndicator(inputMode);
  const characterCount = createCharacterCountIndicator(data, codons, inputMode);
  const segment = [ mode, characterCount, ...codons ];
  //console.debug("encodeSegment", { segment });

  const { bitMap, segmentMap } = createMaps(segment);

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