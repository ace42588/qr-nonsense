import { describe, it, expect } from "vitest";
import { ReedSolomonEncoder } from "../index";
import {
  buildBitIdIndex,
  getDamagedReceived,
  getBlockBitIds,
} from "../applyFlips";
import { createMockBlock } from "../../../qart/__tests__/utils";
import { codewordsToBytes } from "../../../qart/codewordConversion";

describe("applyFlips", () => {
  it("indexes every data and EC bit exactly once", () => {
    const encoder = new ReedSolomonEncoder(4);
    const data = [0x12, 0x34, 0x56];
    const ec = Array.from(encoder.encode(new Uint8ClampedArray(data)));
    const block = createMockBlock(data, ec, 0);
    const index = buildBitIdIndex([block]);

    const expectedBits =
      (block.data.length + block.errorCorrection.length) * 8;
    expect(index.size).toBe(expectedBits);
    expect(getBlockBitIds(block)).toHaveLength(expectedBits);

    // First data bit is MSB of byte 0
    const firstBitId = block.data[0].bits[0].id;
    expect(index.get(firstBitId)).toEqual({
      blockIndex: 0,
      byteIndex: 0,
      bitIndex: 0,
    });

    // First EC bit follows all data bytes
    const firstEcBitId = block.errorCorrection[0].bits[0].id;
    expect(index.get(firstEcBitId)).toEqual({
      blockIndex: 0,
      byteIndex: data.length,
      bitIndex: 0,
    });
  });

  it("flipping a known bit changes the expected byte bit", () => {
    const encoder = new ReedSolomonEncoder(4);
    const data = [0b10110000, 0x00];
    const ec = Array.from(encoder.encode(new Uint8ClampedArray(data)));
    const block = createMockBlock(data, ec, 0);
    const index = buildBitIdIndex([block]);
    const { dataBytes, ecBytes } = codewordsToBytes(block);
    const clean = new Uint8ClampedArray(dataBytes.length + ecBytes.length);
    clean.set(dataBytes, 0);
    clean.set(ecBytes, dataBytes.length);

    // Flip MSB of first data byte (bitIndex 0)
    const bitId = block.data[0].bits[0].id;
    const damaged = getDamagedReceived(block, 0, [bitId], index);

    expect(damaged[0]).toBe(clean[0] ^ 0b10000000);
    // Other bytes unchanged
    for (let i = 1; i < clean.length; i++) {
      expect(damaged[i]).toBe(clean[i]);
    }
  });

  it("ignores flips that belong to other blocks", () => {
    const encoder = new ReedSolomonEncoder(2);
    const data0 = [0xaa];
    const data1 = [0xbb];
    const ec0 = Array.from(encoder.encode(new Uint8ClampedArray(data0)));
    const ec1 = Array.from(encoder.encode(new Uint8ClampedArray(data1)));
    const block0 = createMockBlock(data0, ec0, 0);
    const block1 = createMockBlock(data1, ec1, 1);
    const index = buildBitIdIndex([block0, block1]);

    const flipOther = block1.data[0].bits[0].id;
    const damaged = getDamagedReceived(block0, 0, [flipOther], index);
    const { dataBytes, ecBytes } = codewordsToBytes(block0);
    const clean = new Uint8ClampedArray([...dataBytes, ...ecBytes]);

    expect(Array.from(damaged)).toEqual(Array.from(clean));
  });
});
