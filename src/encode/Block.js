import { TaggedCodeword, ECCodeword } from "./TaggedCodeword"
import { ReedSolomonEncoder } from "./reedsolomon/index.js";

class Block {
  constructor(numDataCodewords, numECCodewords, id) {
    this.numDataCodewords = numDataCodewords;
    this.numECCodewords = numECCodewords;
    this.totalCodewords = numDataCodewords + numECCodewords;
    this.rsEncoder = new ReedSolomonEncoder(numECCodewords);
    this.dataCodewords = [];
    this.ecCodewords = [];
    this.id = id;
  }

  generateErrorCorrection() {
    const dataBytes = this.dataCodewords.map((c) => c.byte);
    //console.log(dataBytes);
    const ecBytes = this.rsEncoder.encode(dataBytes);
    const ecCodewords = Array.from(ecBytes).map((b, idx) => new ECCodeword(b, idx));
    //console.log("generateErrorCorrection", { ec: ecCodewords.map((c) => c.byte) });
    this.ecCodewords = ecCodewords;
  }

  get codewords() {
    return [...this.dataCodewords, ...this.ecCodewords];
  }
}

export function createBlocks(bitStream, errorCorrectionLevel, version) {
  //console.log("createBlocks", { bitStream, errorCorrectionLevel, version });
  const { errorCorrectionLevels } = version;
  const { ecCodewordsPerBlock, ecBlocks } =
    errorCorrectionLevels[errorCorrectionLevel];

  let blocks = [];
  let requiredDataCodewords = 0;

  ecBlocks.forEach((group) => {
    const { numBlocks, dataCodewordsPerBlock } = group;
    requiredDataCodewords += numBlocks * dataCodewordsPerBlock;
    for (let i = 0; i < numBlocks; i++) {
      const block = new Block(dataCodewordsPerBlock, ecCodewordsPerBlock, i);
      blocks.push(block);
    }
  });

  // Complete bytes and add padding
  bitStream.finalize(requiredDataCodewords);
  // If we are recalculating, we need to reset the read index
  bitStream.resetReadPosition();
  // fill blocks with codewords
  for (const block of blocks) {
    const { dataCodewords, numDataCodewords } = block;
    while (dataCodewords.length < numDataCodewords) {
      const taggedBits = bitStream.readTaggedByte();
      const codeword = new TaggedCodeword(taggedBits, dataCodewords.length);
      dataCodewords.push(codeword);
    }
  }

  //console.log({ blocks });
  return blocks;
}
