import GenericGF, { addOrSubtractGF, getQRCodeField } from "./GenericGF";
import GenericGFPoly from "./GenericGFPoly";

export interface DecodeResult {
  ok: boolean;
  syndromes: number[];
  errorLocations: number[];
  errorMagnitudes: number[];
  corrected: Uint8ClampedArray;
  errorsCorrected: number;
}

/**
 * Reed-Solomon decoder for QR code blocks (errors only; no erasures).
 * Conventions match ZXing for GF(256) with generatorBase 0.
 */
export class ReedSolomonDecoder {
  private field: GenericGF;

  constructor(field?: GenericGF) {
    this.field = field ?? getQRCodeField();
  }

  decode(received: Uint8ClampedArray, twoS: number): DecodeResult {
    const corrected = new Uint8ClampedArray(received);
    const poly = new GenericGFPoly(this.field, corrected);
    const syndromeCoefficients = new Uint8ClampedArray(twoS);
    let noError = true;

    for (let i = 0; i < twoS; i++) {
      const evalAt = poly.evaluateAt(
        this.field.exp(i + this.field.getGeneratorBase())
      );
      syndromeCoefficients[syndromeCoefficients.length - 1 - i] = evalAt;
      if (evalAt !== 0) {
        noError = false;
      }
    }

    const syndromes = Array.from(syndromeCoefficients).reverse();

    if (noError) {
      return {
        ok: true,
        syndromes,
        errorLocations: [],
        errorMagnitudes: [],
        corrected,
        errorsCorrected: 0,
      };
    }

    try {
      const syndrome = new GenericGFPoly(this.field, syndromeCoefficients);
      const [sigma, omega] = this.runEuclideanAlgorithm(
        this.field.buildMonomial(twoS, 1),
        syndrome,
        twoS
      );
      const errorLocations = this.findErrorLocations(sigma);
      const errorMagnitudes = this.findErrorMagnitudes(omega, errorLocations);

      for (let i = 0; i < errorLocations.length; i++) {
        const position =
          corrected.length - 1 - this.field.log(errorLocations[i]);
        if (position < 0) {
          return this.fail(syndromes, corrected);
        }
        corrected[position] = addOrSubtractGF(
          corrected[position],
          errorMagnitudes[i]
        );
      }

      // Verify correction by recomputing syndromes
      const checkPoly = new GenericGFPoly(this.field, corrected);
      for (let i = 0; i < twoS; i++) {
        if (
          checkPoly.evaluateAt(
            this.field.exp(i + this.field.getGeneratorBase())
          ) !== 0
        ) {
          return this.fail(syndromes, received);
        }
      }

      const byteLocations = errorLocations.map(
        (loc) => corrected.length - 1 - this.field.log(loc)
      );

      return {
        ok: true,
        syndromes,
        errorLocations: byteLocations,
        errorMagnitudes: Array.from(errorMagnitudes),
        corrected,
        errorsCorrected: errorLocations.length,
      };
    } catch {
      return this.fail(syndromes, received);
    }
  }

  private fail(
    syndromes: number[],
    received: Uint8ClampedArray
  ): DecodeResult {
    return {
      ok: false,
      syndromes,
      errorLocations: [],
      errorMagnitudes: [],
      corrected: new Uint8ClampedArray(received),
      errorsCorrected: 0,
    };
  }

  private runEuclideanAlgorithm(
    a: GenericGFPoly,
    b: GenericGFPoly,
    R: number
  ): [GenericGFPoly, GenericGFPoly] {
    // Assume a's degree >= b's
    if (a.degree() < b.degree()) {
      [a, b] = [b, a];
    }

    let rLast = a;
    let r = b;
    let tLast = this.field.zero;
    let t = this.field.one;

    // Run Euclidean algorithm until r's degree is less than R/2
    while (r.degree() >= Math.floor(R / 2)) {
      const rLastLast = rLast;
      const tLastLast = tLast;
      rLast = r;
      tLast = t;

      if (rLast.isZero()) {
        throw new Error("r_{i-1} was zero");
      }
      r = rLastLast;
      let q = this.field.zero;
      const denominatorLeadingTerm = rLast.getCoefficient(rLast.degree());
      const dltInverse = this.field.inverse(denominatorLeadingTerm);
      while (r.degree() >= rLast.degree() && !r.isZero()) {
        const degreeDiff = r.degree() - rLast.degree();
        const scale = this.field.multiply(
          r.getCoefficient(r.degree()),
          dltInverse
        );
        q = q.addOrSubtract(this.field.buildMonomial(degreeDiff, scale));
        r = r.addOrSubtract(rLast.multiplyByMonomial(degreeDiff, scale));
      }

      t = q.multiplyPoly(tLast).addOrSubtract(tLastLast);

      if (r.degree() >= rLast.degree()) {
        throw new Error("Division algorithm failed to reduce polynomial");
      }
    }

    const sigmaTildeAtZero = t.getCoefficient(0);
    if (sigmaTildeAtZero === 0) {
      throw new Error("sigmaTilde(0) was zero");
    }

    const inverse = this.field.inverse(sigmaTildeAtZero);
    const sigma = t.multiply(inverse);
    const omega = r.multiply(inverse);
    return [sigma, omega];
  }

  private findErrorLocations(errorLocator: GenericGFPoly): number[] {
    const numErrors = errorLocator.degree();
    if (numErrors === 1) {
      return [errorLocator.getCoefficient(1)];
    }
    const result: number[] = [];
    let e = 0;
    for (let i = 1; i < this.field.getSize() && e < numErrors; i++) {
      if (errorLocator.evaluateAt(i) === 0) {
        result.push(this.field.inverse(i));
        e++;
      }
    }
    if (e !== numErrors) {
      throw new Error("Error locator degree does not match number of roots");
    }
    return result;
  }

  private findErrorMagnitudes(
    errorEvaluator: GenericGFPoly,
    errorLocations: number[]
  ): number[] {
    const s = errorLocations.length;
    const result = new Array<number>(s);
    for (let i = 0; i < s; i++) {
      const xiInverse = this.field.inverse(errorLocations[i]);
      let denominator = 1;
      for (let j = 0; j < s; j++) {
        if (i !== j) {
          denominator = this.field.multiply(
            denominator,
            addOrSubtractGF(
              1,
              this.field.multiply(errorLocations[j], xiInverse)
            )
          );
        }
      }
      result[i] = this.field.multiply(
        errorEvaluator.evaluateAt(xiInverse),
        this.field.inverse(denominator)
      );
      if (this.field.getGeneratorBase() !== 0) {
        result[i] = this.field.multiply(result[i], xiInverse);
      }
    }
    return result;
  }
}

/** Convenience decode using the QR code field singleton. */
export function decodeReedSolomon(
  received: Uint8ClampedArray,
  twoS: number
): DecodeResult {
  return new ReedSolomonDecoder().decode(received, twoS);
}
