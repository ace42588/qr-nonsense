import { describe, it, expect } from "vitest";
import { ReedSolomonEncoder } from "../index";
import { ReedSolomonDecoder } from "../decoder";
import { createMockBlock } from "../../../qart/__tests__/utils";
import { codewordsToBytes } from "../../../qart/codewordConversion";

function buildReceived(
  data: Uint8ClampedArray,
  ecCodewords: number
): Uint8ClampedArray {
  const encoder = new ReedSolomonEncoder(ecCodewords);
  const ec = encoder.encode(data);
  const received = new Uint8ClampedArray(data.length + ec.length);
  received.set(data, 0);
  received.set(ec, data.length);
  return received;
}

describe("ReedSolomonDecoder", () => {
  const decoder = new ReedSolomonDecoder();

  it("decodes a clean block with zero errors", () => {
    const data = new Uint8ClampedArray([0x12, 0x34, 0x56, 0x78]);
    const twoS = 4;
    const received = buildReceived(data, twoS);

    const result = decoder.decode(received, twoS);

    expect(result.ok).toBe(true);
    expect(result.errorsCorrected).toBe(0);
    expect(result.syndromes.every((s) => s === 0)).toBe(true);
    expect(Array.from(result.corrected)).toEqual(Array.from(received));
  });

  it("corrects a single corrupted byte", () => {
    const data = new Uint8ClampedArray([0x01, 0x02, 0x03, 0x04, 0x05]);
    const twoS = 4; // t = 2
    const original = buildReceived(data, twoS);
    const damaged = new Uint8ClampedArray(original);
    damaged[1] ^= 0xff;

    const result = decoder.decode(damaged, twoS);

    expect(result.ok).toBe(true);
    expect(result.errorsCorrected).toBe(1);
    expect(Array.from(result.corrected)).toEqual(Array.from(original));
  });

  it("corrects up to t errors", () => {
    const data = new Uint8ClampedArray([10, 20, 30, 40, 50, 60]);
    const twoS = 6; // t = 3
    const original = buildReceived(data, twoS);
    const damaged = new Uint8ClampedArray(original);
    damaged[0] ^= 0xaa;
    damaged[3] ^= 0x55;
    damaged[original.length - 1] ^= 0x0f;

    const result = decoder.decode(damaged, twoS);

    expect(result.ok).toBe(true);
    expect(result.errorsCorrected).toBe(3);
    expect(Array.from(result.corrected)).toEqual(Array.from(original));
  });

  it("fails when more than t bytes are corrupted", () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4]);
    const twoS = 4; // t = 2
    const original = buildReceived(data, twoS);
    const damaged = new Uint8ClampedArray(original);
    damaged[0] ^= 0x11;
    damaged[1] ^= 0x22;
    damaged[2] ^= 0x33;

    const result = decoder.decode(damaged, twoS);

    expect(result.ok).toBe(false);
    expect(result.errorsCorrected).toBe(0);
  });

  it("round-trips a mock QR block", () => {
    const dataBytes = [0x12, 0x34, 0x56];
    const twoS = 4;
    const encoder = new ReedSolomonEncoder(twoS);
    const ec = encoder.encode(new Uint8ClampedArray(dataBytes));
    const block = createMockBlock(dataBytes, Array.from(ec));
    const { dataBytes: d, ecBytes: e } = codewordsToBytes(block);
    const received = new Uint8ClampedArray(d.length + e.length);
    received.set(d, 0);
    received.set(e, d.length);

    // Corrupt one EC byte
    const damaged = new Uint8ClampedArray(received);
    damaged[d.length] ^= 0x7f;

    const result = decoder.decode(damaged, twoS);

    expect(result.ok).toBe(true);
    expect(result.errorsCorrected).toBe(1);
    expect(Array.from(result.corrected)).toEqual(Array.from(received));
  });
});
