import GenericGFPoly from './GenericGFPoly';

export function addOrSubtractGF(a: number, b: number): number {
  return a ^ b; // Bitwise XOR
}

class GenericGF {
  private primitive: number;
  private size: number;
  private generatorBase: number;
  private expTable: number[];
  private logTable: number[];
  public zero: GenericGFPoly;
  public one: GenericGFPoly;

  constructor(primitive: number, size: number, genBase: number) {
    this.primitive = primitive;
    this.size = size;
    this.generatorBase = genBase;
    this.expTable = new Array(this.size);
    this.logTable = new Array(this.size);

    let x = 1;
    for (let i = 0; i < this.size; i++) {
      this.expTable[i] = x;
      x = x * 2;
      if (x >= this.size) {
        x = (x ^ this.primitive) & (this.size - 1);
      }
    }

    for (let i = 0; i < this.size - 1; i++) {
      this.logTable[this.expTable[i]] = i;
    }
    this.zero = new GenericGFPoly(this, Uint8ClampedArray.from([0]));
    this.one = new GenericGFPoly(this, Uint8ClampedArray.from([1]));
  }

  multiply(a: number, b: number): number {
    if (a === 0 || b === 0) {
      return 0;
    }
    return this.expTable[(this.logTable[a] + this.logTable[b]) % (this.size - 1)];
  }

  inverse(a: number): number {
    if (a === 0) {
      throw new Error("Can't invert 0");
    }
    return this.expTable[this.size - this.logTable[a] - 1];
  }

  buildMonomial(degree: number, coefficient: number): GenericGFPoly {
    if (degree < 0) {
      throw new Error("Invalid monomial degree less than 0");
    }
    if (coefficient === 0) {
      return this.zero;
    }
    const coefficients = new Uint8ClampedArray(degree + 1);
    coefficients[0] = coefficient;
    return new GenericGFPoly(this, coefficients);
  }

  log(a: number): number {
    if (a === 0) {
      throw new Error("Can't take log(0)");
    }
    return this.logTable[a];
  }

  exp(a: number): number {
    return this.expTable[a];
  }

  getSize(): number {
    return this.size;
  }

  getGeneratorBase(): number {
    return this.generatorBase;
  }
}

// Singleton instance for QR code standard field (0x11d, 256, 0)
// This is the only field used in QR codes, so we can cache it globally
let qrCodeFieldInstance: GenericGF | null = null;

export function getQRCodeField(): GenericGF {
  if (!qrCodeFieldInstance) {
    qrCodeFieldInstance = new GenericGF(0x11d, 256, 0);
  }
  return qrCodeFieldInstance;
}

export default GenericGF; 