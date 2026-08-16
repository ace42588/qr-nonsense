import GenericGF, { getQRCodeField } from "./GenericGF";
import GenericGFPoly from "./GenericGFPoly";

export {
  ReedSolomonDecoder,
  decodeReedSolomon,
  type DecodeResult,
} from "./decoder";

export {
  buildBitIdIndex,
  getDamagedReceived,
  getBlockBitIds,
  type BitLocation,
} from "./applyFlips";

export class ReedSolomonEncoder {
  private numEcCodewords: number;
  private field: GenericGF;
  private cachedGenerators: GenericGFPoly[];
  private generatorPoly: GenericGFPoly;

  constructor(numEcCodewords: number) {
    if (numEcCodewords <= 0) {
      throw new Error("No error correction bytes");
    }
    this.numEcCodewords = numEcCodewords;
    // Use singleton field instance instead of creating new one
    this.field = getQRCodeField();
    this.cachedGenerators = [
      new GenericGFPoly(this.field, new Uint8ClampedArray([1])),
    ];
    this.generatorPoly = this.buildGenerator(numEcCodewords);
  }

  private buildGenerator(degree: number): GenericGFPoly {
    if (degree >= this.cachedGenerators.length) {
      let lastGenerator =
        this.cachedGenerators[this.cachedGenerators.length - 1];
      for (let d = this.cachedGenerators.length; d <= degree; d++) {
        const nextGenerator = lastGenerator.multiplyPoly(
          new GenericGFPoly(
            this.field,
            new Uint8ClampedArray([1, this.field.exp(d - 1)])
          )
        );
        this.cachedGenerators.push(nextGenerator);
        lastGenerator = nextGenerator;
      }
    }
    return this.cachedGenerators[degree];
  }

  encode(data: Uint8ClampedArray): Uint8ClampedArray {
    let msgPoly = new GenericGFPoly(this.field, data);
    msgPoly = msgPoly.multiplyByMonomial(this.numEcCodewords, 1);
    const remainder = msgPoly.divide(this.generatorPoly)[1];
    const ecBytes = new Uint8ClampedArray(this.numEcCodewords);
    const remainderLength = remainder.coefficients.length;
    const numZeroCoefficients = this.numEcCodewords - remainderLength;
    for (let i = 0; i < numZeroCoefficients; i++) {
      ecBytes[i] = 0;
    }
    ecBytes.set(remainder.coefficients, numZeroCoefficients);
    return ecBytes;
  }
} 
