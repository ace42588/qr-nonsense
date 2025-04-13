import { TaggedBit } from "../encode/TaggedBit";
import Encoders from "./Encoders"

import { VERSIONS } from "./version";

const PAD_BYTES = [
  [
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 236, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 236, encoding: "none" }),
  ],
  [
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "0", type: "padding", source: 17, encoding: "none" }),
    new TaggedBit({ bit: "1", type: "padding", source: 17, encoding: "none" }),
  ],
];

function finalize(bits, versionNum, errorCorrectionLevel) {
  const { errorCorrectionLevels } = VERSIONS[versionNum - 1];
  const { ecCodewordsPerBlock, ecBlocks } =
    errorCorrectionLevels[errorCorrectionLevel];

  const requiredDataCodewords = ecBlocks.reduce(
    (t, { numBlocks, dataCodewordsPerBlock }) =>
      t + numBlocks * dataCodewordsPerBlock,
    0
  );
  let finalBits = [...bits];
  let bitStr;
  let requiredBits = requiredDataCodewords * 8;
  let remaining = requiredBits - bits.length;
  // add terminator if there is space
  if (0 < remaining <= 4) {
    bitStr = "".padStart(remaining, "0");
  }
  const termBits = [...bitStr].map(
    (bit) =>
      new TaggedBit({
        bit,
        type: "terminator",
        source: "terminator",
      })
  );
  finalBits = [...finalBits, ...termBits];
  // bits needed to fill the codeword
  remaining = 8 - (finalBits.length % 8);
  if (0 < remaining < 8) {
    bitStr = "".padStart(remaining, "0");
  }
  const fillBits = [...bitStr].map(
    (bit) =>
      new TaggedBit({
        bit,
        type: "terminator",
        source: "fill",
      })
  );
  finalBits = [...finalBits, ...fillBits];
  const currentCodewords = finalBits.length / 8;
  const codewordsNeeded = requiredDataCodewords - currentCodewords;
  for (let i = 0; i < codewordsNeeded; i++) {
    finalBits = [...finalBits, ...PAD_BYTES[i % 2]];
  }

  return finalBits;
}

export default function BitstreamReducer(state, action) {
  switch (action.type) {
    case "ENCODE_DATA": {
      const { mode, encoding, data } = action.payload;
      const { segments: newSegments, bits: newBits } = Encoders[mode].encode(
        data,
        encoding
      );
      const finalBits = finalize();
      return {
        ...state,
        segments: [...state.segments, ...newSegments],
        bits: [...state.bits, ...newBits],
      };
    }
    case "HIGHLIGHT_DATA": {
    }
  }
}
