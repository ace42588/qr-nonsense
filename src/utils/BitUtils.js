import { PAD_BYTES, CodewordLength } from "../Constants";
import { TaggedBit } from "../Tagged";

let lastBitId = 0;

// ~24k bits possible
function getId() {
  if (lastBitId >= 0xffff) lastBitId = 0;

  return lastBitId++;
}

// ~24k bits possible
export function getBits(value, length) {
  switch (typeof value) {
    case "string": {
      const re = /[01]{2,}/gm;
      if (!re.test(value))
        throw new Error(
          `Invalid string value for getBits(): ${JSON.stringify(value)}`
        );
      return [...value].map((bit, idx) => ({
        bit: parseInt(bit),
        id: getId(),
      }));
    }
    case "number": {
      if (value < 0 || value > 255)
        throw new Error(
          `Invalid byte value for getBits(): ${value.toString()}`
        );
      return Array.from({ length: 8 }).map((_, idx) => ({
        bit: (value >> (7 - idx)) & 1,
        id: getId(),
      }));
    }
    default: {
      throw new Error(`Invalid value for getBits(): ${JSON.stringify(value)}`);
    }
  }
}

function getHeaderBits(header, chunkId) {
  const { mode, characterCount } = header;
  const modeBits = BitUtils.toPaddedBinary(mode.value, mode.length);
  const modeTagged = getBits(modeBits);
  mode.bitIds = modeTagged.map(({ id }) => id);
  const charCountBits = BitUtils.toPaddedBinary(
    characterCount.value,
    characterCount.length
  );
  const countTagged = getBits(charCountBits);
  characterCount.bitIds = countTagged.map(({ id }) => id);
  const headerBits = [...modeTagged, ...countTagged];
  //console.debug("getHeaderBits", { headerBits });
  return headerBits;
}

function getSegmentBits(segments, chunkId) {
  const segmentBits = segments.flatMap((segment) => {
    const bits = getBits(segment.value);
    segment.bitIds = bits.map(({ id }) => id);
    return bits;
  });
  //console.debug("getSegmentBits", { segmentBits });
  return segments.flatMap((segment) => getBits(segment.value));
}

export const BitUtils = {
  /**
   * Creates string of bits given a value and length
   * @param {number} value - The value to convert and pad.
   * @param {number} length - The desired string length.
   * @returns {string} String of binary.
   */
  toPaddedBinary(value, length) {
    return value.toString(2).padStart(length, "0");
  },

  /**
   * Creates an array of TaggedBit instances from a string of bits.
   * @param {string} bits - The binary string.
   * @param {string} type - Type of the bit.
   * @param {*} source - Source identifier.
   * @returns {TaggedBit[]} Array of TaggedBit instances.
   */
  createTaggedBits(bitStr, sourceType, sourceValue, mode) {
    //console.debug("createTaggedBits", { bitStr, sourceType, sourceValue, mode });
    return [...bitStr].map((bit, idx) => {
      const taggedBit = new TaggedBit({
        bit,
        type: sourceType,
        source: sourceValue,
        id: idx,
        mode,
      });
      if (mode && typeof mode === "object") {
        taggedBit.mode = mode.name;
      }
      return taggedBit;
    });
  },

  getBitsFromChunks(chunks) {
    //console.debug("getBitsFromChunks", { chunks });
    return chunks.flatMap((chunk, idx) => {
      console.debug("getBitsFromChunks", { chunk });
      const { header, segments } = chunk;
      const headerBits = getHeaderBits(header, idx);
      header.bitIds = headerBits.map(({ id }) => id);
      const segmentBits = getSegmentBits(segments, idx);
      segments.bitIds = segmentBits.map(({ id }) => id);
      const bits = [...headerBits, ...segmentBits];
      return bits;
    });
  },
  getTerminatorBits(bits, requiredDataCodewords) {
    let length = getTerminatorLength(requiredDataCodewords, bits);
    const bitStr = "".padStart(length, "0");
    return BitUtils.createTaggedBits(bitStr, "terminator", null, null);
  },
  getCodewordFillBits(bits, requiredDataCodewords) {
    let bitStr;
    let remaining = CodewordLength - (bits.length % CodewordLength);
    if (0 < remaining < CodewordLength) {
      bitStr = "".padStart(remaining, "0");
    }
    return BitUtils.createTaggedBits(bitStr, "fill", null, null);
  },
  getPaddingBits(bits, requiredDataCodewords) {
    const length = bits.length;
    if (length % CodewordLength !== 0)
      throw new Error(`Bits (length: ${length}) aren't codeword/byte aligned!`);
    const currentCodewords = length / CodewordLength;
    const codewordsNeeded = requiredDataCodewords - currentCodewords;
    let padding = [];
    for (let i = 0; i < codewordsNeeded; i++) {
      const paddingByte = paddingBytes[i % 2];
      padding = [...padding, ...paddingBytes[i % 2]];
    }
    return padding;
  },
};

const paddingBytes = PAD_BYTES.map((byte) => {
  //console.debug("paddingBytes", { byte });
  const bits = byte.toString(2);
  return BitUtils.createTaggedBits(bits, "padding", byte, null);
});

function getTerminatorLength(capacityBytes, totalDataBits) {
  const capacityBits = capacityBytes * CodewordLength;
  return Math.min(4, Math.max(0, capacityBits - totalDataBits));
}
