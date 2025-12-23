/**
 * Unit tests for QArt codeword conversion utilities
 */

import { describe, it, expect } from "vitest";
import { codewordsToBytes, bytesToCodewords } from "@/domain/qart/codewordConversion";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import {
  createMockBlock,
  extractBytesFromBlock,
} from "./utils";

describe("Codeword Conversion", () => {
  describe("codewordsToBytes", () => {
    it("should convert data codewords to bytes correctly", () => {
      const block = createMockBlock([0x12, 0x34], [0x56]);
      const { dataBytes, ecBytes } = codewordsToBytes(block);

      expect(dataBytes.length).toBe(2);
      expect(dataBytes[0]).toBe(0x12);
      expect(dataBytes[1]).toBe(0x34);
    });

    it("should convert EC codewords to bytes correctly", () => {
      const block = createMockBlock([0x12], [0x56, 0x78]);
      const { dataBytes, ecBytes } = codewordsToBytes(block);

      expect(ecBytes.length).toBe(2);
      expect(ecBytes[0]).toBe(0x56);
      expect(ecBytes[1]).toBe(0x78);
    });

    it("should handle single codeword blocks", () => {
      const block = createMockBlock([0xFF], [0xAA]);
      const { dataBytes, ecBytes } = codewordsToBytes(block);

      expect(dataBytes.length).toBe(1);
      expect(ecBytes.length).toBe(1);
      expect(dataBytes[0]).toBe(0xFF);
      expect(ecBytes[0]).toBe(0xAA);
    });

    it("should handle multiple codeword blocks", () => {
      const block = createMockBlock([0x01, 0x02, 0x03], [0x04, 0x05]);
      const { dataBytes, ecBytes } = codewordsToBytes(block);

      expect(dataBytes.length).toBe(3);
      expect(ecBytes.length).toBe(2);
      expect(dataBytes).toEqual(new Uint8ClampedArray([0x01, 0x02, 0x03]));
      expect(ecBytes).toEqual(new Uint8ClampedArray([0x04, 0x05]));
    });

    it("should handle zero values", () => {
      const block = createMockBlock([0x00], [0x00]);
      const { dataBytes, ecBytes } = codewordsToBytes(block);

      expect(dataBytes[0]).toBe(0x00);
      expect(ecBytes[0]).toBe(0x00);
    });

    it("should handle maximum byte values", () => {
      const block = createMockBlock([0xFF], [0xFF]);
      const { dataBytes, ecBytes } = codewordsToBytes(block);

      expect(dataBytes[0]).toBe(0xFF);
      expect(ecBytes[0]).toBe(0xFF);
    });
  });

  describe("bytesToCodewords", () => {
    it("should update codewords from byte arrays", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dataBytes = new Uint8ClampedArray([0x12]);
      const ecBytes = new Uint8ClampedArray([0x34]);

      bytesToCodewords(block, dataBytes, ecBytes);

      const { dataBytes: resultData, ecBytes: resultEC } = extractBytesFromBlock(block);
      expect(resultData[0]).toBe(0x12);
      expect(resultEC[0]).toBe(0x34);
    });

    it("should update multiple codewords correctly", () => {
      const block = createMockBlock([0x00, 0x00], [0x00, 0x00]);
      const dataBytes = new Uint8ClampedArray([0x12, 0x34]);
      const ecBytes = new Uint8ClampedArray([0x56, 0x78]);

      bytesToCodewords(block, dataBytes, ecBytes);

      const { dataBytes: resultData, ecBytes: resultEC } = extractBytesFromBlock(block);
      expect(resultData).toEqual([0x12, 0x34]);
      expect(resultEC).toEqual([0x56, 0x78]);
    });

    it("should preserve bit values correctly", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dataBytes = new Uint8ClampedArray([0xAA]); // 10101010

      bytesToCodewords(block, dataBytes, new Uint8ClampedArray([0x00]));

      // Verify bits are set correctly
      const codeword = block.data[0];
      expect(codeword.bits[0].value).toBe(1);
      expect(codeword.bits[1].value).toBe(0);
      expect(codeword.bits[2].value).toBe(1);
      expect(codeword.bits[3].value).toBe(0);
      expect(codeword.bits[4].value).toBe(1);
      expect(codeword.bits[5].value).toBe(0);
      expect(codeword.bits[6].value).toBe(1);
      expect(codeword.bits[7].value).toBe(0);
    });

    it("should handle round-trip conversion", () => {
      const originalBlock = createMockBlock([0x12, 0x34], [0x56, 0x78]);
      const { dataBytes: originalData, ecBytes: originalEC } = codewordsToBytes(originalBlock);

      const testBlock = createMockBlock([0x00, 0x00], [0x00, 0x00]);
      bytesToCodewords(testBlock, originalData, originalEC);

      const { dataBytes: resultData, ecBytes: resultEC } = codewordsToBytes(testBlock);
      expect(resultData).toEqual(originalData);
      expect(resultEC).toEqual(originalEC);
    });

    it("should handle edge case values", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dataBytes = new Uint8ClampedArray([0xFF]);
      const ecBytes = new Uint8ClampedArray([0x00]);

      bytesToCodewords(block, dataBytes, ecBytes);

      const { dataBytes: resultData } = extractBytesFromBlock(block);
      expect(resultData[0]).toBe(0xFF);
    });

    it("should update all bits in a codeword", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dataBytes = new Uint8ClampedArray([0x55]); // 01010101

      bytesToCodewords(block, dataBytes, new Uint8ClampedArray([0x00]));

      const codeword = block.data[0];
      // Verify all 8 bits are updated
      for (let i = 0; i < 8; i++) {
        const expectedValue = (0x55 >> (7 - i)) & 1;
        expect(codeword.bits[i].value).toBe(expectedValue);
      }
    });
  });
});

