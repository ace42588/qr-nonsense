import { RemainderBit, ECBit } from "./encode/TaggedBit";

const DATA_MASKS = [
  (p) => (p.y + p.x) % 2 === 0,
  (p) => p.y % 2 === 0,
  (p) => p.x % 3 === 0,
  (p) => (p.y + p.x) % 3 === 0,
  (p) => (Math.floor(p.y / 2) + Math.floor(p.x / 3)) % 2 === 0,
  (p) => ((p.x * p.y) % 2) + ((p.x * p.y) % 3) === 0,
  (p) => (((p.y * p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
  (p) => (((p.y + p.x) % 2) + ((p.y * p.x) % 3)) % 2 === 0,
];

const REMAINDER_BIT = new RemainderBit();

export class QRModule {
  constructor({ taggedBit, x, y, maskNum }) {
    this.bit = taggedBit;
    this.segment = this.bit.source;
    this.x = x;
    this.y = y;
    this.setMask(maskNum);
    this.highlighted = false;
  }
  
  setMask(maskNum) {
    this.maskFunction = DATA_MASKS[maskNum];
  }
  
  isMasked() {
    this.maskFunction({ x: this.x, y: this.y })
  }

  isDark() {
    return this.isMasked ? !this.bit.value : this.bit.value;
  }

  isHighlighted() {
    return this.highlighted;
  }

  highlight() {
    this.highlighted = !this.highlighted;
  }

  toggleBit() {
    this.bit.toggle();
  }
}

export class ModuleFactory {
  constructor(dataMask, bits) {
    this.dataMask = dataMask || 0;
    this.bits = bits || [];
    this.bitIdx = 0;
  }

  setDataMask(mask) {
    if (-1 < mask < 8) this.dataMask = mask;
  }

  setBitSource(bits) {
    this.bitIdx = 0;
    this.bits = bits;
  }

  getDataModule({ x, y }) {
    let taggedBit;
    if (this.bitIdx < this.bits.length) {
      taggedBit = this.bits[this.bitIdx++];
      if (taggedBit instanceof ECBit) {
        this;
      }
    } else {
      taggedBit = REMAINDER_BIT;
    }
    const module = new QRModule({
      taggedBit,
      x,
      y,
      masked: DATA_MASKS[this.dataMask]({ x, y }),
    });
    if (taggedBit.altered) module.highlight();

    return module;
  }
}
