import GenericGF from "./GenericGF.js";
import GenericGFPoly from "./GenericGFPoly.js";

export class ReedSolomonEncoder {
  constructor(numEcCodewords) {
    if (numEcCodewords <= 0) {
      throw new Error("No error correction bytes");
    }
    this.numEcCodewords = numEcCodewords;
    this.field = new GenericGF(0x11d, 256, 0);
    this.cachedGenerators = [
      new GenericGFPoly(this.field, new Uint8ClampedArray([1])),
    ];
    this.generatorPoly = this.buildGenerator(numEcCodewords);
  }

  buildGenerator(degree) {
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

  encode(data) {
    let msgPoly = new GenericGFPoly(this.field, data);
    msgPoly = msgPoly.multiplyByMonomial(this.numEcCodewords, 1);
    const remainder = msgPoly.divide(this.generatorPoly)[1];
    //console.log("ReedSolomonEncoder.encode()", { remainder });
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
