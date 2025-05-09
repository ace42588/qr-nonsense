import { getBits } from "../bitUtils";
import { getRequiredDataCodewords } from "../codewordUtils";

const CodewordLength = 8;

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

function createPart(type, value, text, length) {
  return {
    type: type,
    value: value,
    text: text,
    length: length,
    id: getId(),
  };
}

export function createCodon(value, text, inputMode, length) {
  const codon = createPart("codon", value, text, length);
  return { ...codon, inputMode };
}

function createModeIndicator(mode) {
  return createPart("modeIndicator", mode.bits, mode.name, 4);
}

function createCharacterCountIndicator(data, codons, mode) {
  return createPart(
    "characterCountIndicator",
    data.length,
    data.length,
    computeIndicatorLength(codons.length, mode)
  );
}

export function encodeSegment(data, inputMode, codonItrFn) {
  //console.debug("encodeSegment", { data, inputMode, codonItrFn });
  const codons = [...codonItrFn(data)];
  const mode = createModeIndicator(inputMode);
  const characterCount = createCharacterCountIndicator(data, codons, inputMode);
  const segment = [mode, characterCount, ...codons];
  //console.debug("encodeSegment", { segment });

  return segment;
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

const PAD_BYTES = [236, 17];

export function finalizeEncoding(segments, version, errorCorrectionLevel) {
  const requiredDataCodewords = getRequiredDataCodewords(
    version,
    errorCorrectionLevel
  );
  const numDataBits = () => segments.reduce((total, s) => total + s.length, 0);

  // Add terminator bits, based on version capacity
  const numTermBits = getTerminatorLength(requiredDataCodewords, numDataBits());
  if (numTermBits > 0)
    segments.push(createPart("terminator", 0, numTermBits, numTermBits));

  // add filler bits to complete the last codeword
  const remainder = numDataBits() % CodewordLength;
  const numFillBits = remainder > 0 ? CodewordLength - remainder : 0;
  if (numFillBits > 0)
    segments.push(createPart("fill", 0, numFillBits, numFillBits));

  // add padding to fill the capacity
  const numPadBytes =
    requiredDataCodewords - Math.ceil(numDataBits() / CodewordLength);
  const padding = Array.from({ length: numPadBytes }, (_, i) =>
    createPart("padding", PAD_BYTES[i % 2], PAD_BYTES[i % 2], 8)
  );
  segments = [...segments, ...padding];

  const idMap = new Map();
  const bits = segments.flatMap((s) => {
    const bits = getBits(s.value, s.length, s);
    idMap.set(
      s.id,
      bits.map((b) => b.id)
    );
    bits.forEach((b) => idMap.set(b.id, s.id));
    return bits;
  });

  return { segments, bits, idMap };
}
