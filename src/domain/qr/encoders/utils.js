import { generateId } from "../utils/id";

const CODEWORD_LENGTH = 8;

export function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
}

export function createSymbol(type, value, text, length) {
  return {
    type: type,
    value: value,
    text: text,
    length: length,
    id: generateId(),
  };
}

export function createDataSymbol(value, text, inputMode, length) {
  const symbol = createSymbol("data", value, text, length);
  return { ...symbol, inputMode };
}

export function createModeIndicator(mode) {
  return createSymbol("modeIndicator", mode.bits, mode.bits, 4);
}

function createCharacterCountIndicator(data, codons, mode) {
  const charCount =
    mode.name === "byte" || mode.name === "kanji"
      ? codons.length
      : data.length;
  function computeIndicatorLength() {
    const { thresholds } = mode;
    for (const { max, length } of thresholds) {
      if (charCount < max) return length;
    }
    return thresholds[thresholds.length - 1].length;
  }

  return createSymbol(
    "characterCountIndicator",
    charCount,
    charCount,
    computeIndicatorLength()
  );
}

export function encodeSegment(data, inputMode, symbolItrFn) {
  // Handle empty data gracefully - return empty segment
  if (!data || data.length === 0) {
    return [];
  }
  const symbols = [...symbolItrFn(data)];
  // If no symbols were generated (invalid input), return empty segment
  if (symbols.length === 0) {
    return [];
  }
  const mode = createModeIndicator(inputMode);
  const characterCount = createCharacterCountIndicator(data, symbols, inputMode);
  const segment = [mode, characterCount, ...symbols];

  return segment;
}

export function* createNonByte(input, mode, encoderFn) {
  // Handle empty or invalid input gracefully
  if (!input || input.length === 0) {
    return; // Return empty generator for empty input
  }
  const groups = input.match(mode.groupingRegex);
  if (!groups || groups.length === 0) {
    return; // Return empty generator for invalid input instead of throwing
  }
  for (let i = 0; i < groups.length; i++) {
    const { value, length } = encoderFn(groups[i]);
    yield createDataSymbol(value, groups[i], mode.name, length);
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
      createSymbol("terminator", 0, numTermBits, numTermBits)
    );
  return segments;
}

export function addFill(segments, numDataCodewords) {
  // add filler bits to complete the last codeword
  const remainder = getNumBits(segments) % CODEWORD_LENGTH;
  const numFillBits = remainder > 0 ? CODEWORD_LENGTH - remainder : 0;
  if (numFillBits > 0)
    return segments.concat(createSymbol("fill", 0, numFillBits, numFillBits));
  return segments;
}

export function addPadding(segments, numDataCodewords) {
  // add padding to fill the capacity
  const PAD_BYTES = [236, 17];
  const numPadBytes =
    numDataCodewords - Math.ceil(getNumBits(segments) / CODEWORD_LENGTH);
  // Over-capacity on a fixed version is allowed (T16): skip padding and
  // leave the oversized bitstream in place so a (possibly unscannable) QR
  // can still be generated.
  if (numPadBytes <= 0) return segments;
  const padding = Array.from({ length: numPadBytes }, (_, i) =>
    createSymbol("padding", PAD_BYTES[i % 2], PAD_BYTES[i % 2], 8)
  );
  return [...segments, ...padding];
}
