const CODEWORD_LENGTH = 8;

function getId() {
  return `${crypto.randomUUID()}`;
}

export function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
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
  const charCount = mode.name === "byte" ? codons.length : data.length;
  function computeIndicatorLength() {
    const { thresholds } = mode;
    for (const { max, length } of thresholds) {
      if (charCount < max) return length;
    }
    return thresholds[thresholds.length - 1].length;
  }

  return createPart(
    "characterCountIndicator",
    charCount,
    charCount,
    computeIndicatorLength()
  );
}

export function encodeSegment(data, inputMode, codonItrFn) {
  const codons = [...codonItrFn(data)];
  const mode = createModeIndicator(inputMode);
  const characterCount = createCharacterCountIndicator(data, codons, inputMode);
  const segment = [mode, characterCount, ...codons];

  return segment;
}

export function* createNonByte(input, mode, encoderFn) {
  const groups = input.match(mode.groupingRegex);
  if (!groups) {
    throw new Error(`Invalid input for ${mode.name} encoder: ${input}`);
  }
  for (let i = 0; i < groups.length; i++) {
    const { value, length } = encoderFn(groups[i]);
    yield createCodon(value, groups[i], mode.name, length);
  }
}

export function getNumBits(segments) {
  return segments.reduce((total, s) => total + s.length, 0);
}

export function addTerminator(segments, numDataCodewords) {
  // Add terminator bits, based on version capacity
  const capacityBits = numDataCodewords * CODEWORD_LENGTH;
  const numTermBits = Math.min(
    4,
    Math.max(0, capacityBits - getNumBits(segments))
  );

  if (numTermBits > 0)
    return segments.concat(
      createPart("terminator", 0, numTermBits, numTermBits)
    );
  return segments;
}

export function addFill(segments, numDataCodewords) {
  // add filler bits to complete the last codeword
  const remainder = getNumBits(segments) % CODEWORD_LENGTH;
  const numFillBits = remainder > 0 ? CODEWORD_LENGTH - remainder : 0;
  if (numFillBits > 0)
    return segments.concat(createPart("fill", 0, numFillBits, numFillBits));
  return segments;
}

export function addPadding(segments, numDataCodewords) {
  // add padding to fill the capacity
  const PAD_BYTES = [236, 17];
  const numPadBytes =
    numDataCodewords - Math.ceil(getNumBits(segments) / CODEWORD_LENGTH);
  const padding = Array.from({ length: numPadBytes }, (_, i) =>
    createPart("padding", PAD_BYTES[i % 2], PAD_BYTES[i % 2], 8)
  );
  return [...segments, ...padding];
}
