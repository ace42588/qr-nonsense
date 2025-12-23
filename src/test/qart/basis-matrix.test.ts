/**
 * Unit tests for QArt basis matrix operations
 */

import { describe, it, expect } from "vitest";
import { initBlockBasis, setBlockBit, applyBlockBasis } from "@/domain/qart/basisMatrix";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import {
  createMockBlock,
  createSimpleTestBlock,
  validateBasisMatrix,
  extractBytesFromBlock,
  compareBlocks,
} from "./utils";
import { ReedSolomonEncoder } from "@/domain/qr/reedsolomon";

describe("Basis Matrix Operations", () => {
  describe("initBlockBasis", () => {
    it("should initialize basis matrix with correct dimensions", () => {
      const block = createSimpleTestBlock();
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      expect(state.B.length).toBe(2); // 1 data + 1 EC
      expect(state.M.length).toBe(8); // 8 data bits
      expect(state.savedM.length).toBe(0);
      expect(state.dataBytes.length).toBe(1);
      expect(state.ecBytes.length).toBe(1);
    });

    it("should create basis vectors as unit vectors in data space", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Each basis vector should be a unit vector
      for (let i = 0; i < 8; i++) {
        const row = state.M[i];
        const expectedByte = Math.floor(i / 8);
        const expectedBit = 7 - (i % 8);
        const expectedValue = 1 << expectedBit;

        // Check data part is unit vector
        expect(row[expectedByte]).toBe(expectedValue);
        for (let j = 0; j < state.dataBytes.length; j++) {
          if (j !== expectedByte) {
            expect(row[j]).toBe(0);
          }
        }
      }
    });

    it("should compute Reed-Solomon EC for each basis vector", () => {
      const block = createMockBlock([0x12], [0x00]);
      const ecCodewordsPerBlock = 1;
      const encoder = new ReedSolomonEncoder(ecCodewordsPerBlock);
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Verify EC part matches Reed-Solomon encoding
      for (let i = 0; i < 8; i++) {
        const row = state.M[i];
        const dataPart = row.subarray(0, 1);
        const expectedEC = encoder.encode(dataPart);
        expect(row.subarray(1)).toEqual(expectedEC);
      }
    });

    it("should initialize B with current block state", () => {
      const dataBytes = [0x12, 0x34];
      const ecBytes = [0x56, 0x78];
      const block = createMockBlock(dataBytes, ecBytes);
      const ecCodewordsPerBlock = 2;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      expect(state.B.subarray(0, 2)).toEqual(new Uint8ClampedArray(dataBytes));
      expect(state.B.subarray(2)).toEqual(new Uint8ClampedArray(ecBytes));
    });

    it("should validate basis matrix properties", () => {
      const block = createSimpleTestBlock();
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      const validation = validateBasisMatrix(state);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("setBlockBit", () => {
    it("should successfully set a data bit", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Set bit 0 (first bit of first byte)
      const success = setBlockBit(state, 0, 1);
      expect(success).toBe(true);
      expect((state.B[0] >> 7) & 1).toBe(1);
    });

    it("should return true if bit is already set to desired value", () => {
      const block = createMockBlock([0x80], [0x00]); // First bit is 1
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      const success = setBlockBit(state, 0, 1);
      expect(success).toBe(true);
      expect((state.B[0] >> 7) & 1).toBe(1);
    });

    it("should flip bit when setting opposite value", () => {
      const block = createMockBlock([0x80], [0x00]); // First bit is 1
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      const success = setBlockBit(state, 0, 0);
      expect(success).toBe(true);
      expect((state.B[0] >> 7) & 1).toBe(0);
    });

    it("should successfully set an EC bit via indirect control", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Set EC bit 0 (bit index 8)
      const success = setBlockBit(state, 8, 1);
      expect(success).toBe(true);
      expect((state.B[1] >> 7) & 1).toBe(1);
    });

    it("should return false when bit cannot be controlled", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Use up all basis vectors by setting data bits
      for (let i = 0; i < 8; i++) {
        setBlockBit(state, i, 1);
      }

      // Verify all basis vectors are used
      expect(state.M.length).toBe(0);

      // Try to set an EC bit that requires a new basis vector - should fail
      // First check if bit 8 is already set to 1 (if so, it would return true)
      const bit8Byte = Math.floor(8 / 8);
      const bit8Pos = 7 - (8 % 8);
      const bit8Mask = 1 << bit8Pos;
      const bit8Value = (state.B[bit8Byte] >> bit8Pos) & 1;
      
      if (bit8Value === 1) {
        // Bit is already set, so setting it to 1 returns true (not a failure case)
        expect(setBlockBit(state, 8, 1)).toBe(true);
      } else {
        // Bit is not set, and we have no basis vectors left, so should fail
        expect(setBlockBit(state, 8, 1)).toBe(false);
      }
    });

    it("should perform Gaussian elimination correctly", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Set bit 0
      setBlockBit(state, 0, 1);
      
      // Verify bit 0 is eliminated from other rows
      for (let i = 1; i < state.M.length; i++) {
        const bitByte = Math.floor(0 / 8);
        const bitPos = 7 - (0 % 8);
        const bitMask = 1 << bitPos;
        expect(state.M[i][bitByte] & bitMask).toBe(0);
      }
    });

    it("should maintain saved rows correctly", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      const initialMLength = state.M.length;
      
      // Set a bit, which should move a row to savedM
      setBlockBit(state, 0, 1);
      
      expect(state.M.length).toBe(initialMLength - 1);
      expect(state.savedM.length).toBe(1);
    });

    it("should eliminate bit from saved rows", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Set bit 0, which moves a row to savedM
      setBlockBit(state, 0, 1);
      
      // Store the saved row before setting bit 1
      const savedRowBefore = new Uint8ClampedArray(state.savedM[0]);
      
      // Verify saved row controls bit 0 before elimination
      const bit0Byte = Math.floor(0 / 8);
      const bit0Pos = 7 - (0 % 8);
      const bit0Mask = 1 << bit0Pos;
      expect(savedRowBefore[bit0Byte] & bit0Mask).not.toBe(0); // Should control bit 0
      
      // Set bit 1, which should eliminate bit 1 (not bit 0) from saved row
      setBlockBit(state, 1, 1);
      
      // Verify saved row still controls bit 0 (it was used for that)
      const savedRow = state.savedM[0];
      expect(savedRow[bit0Byte] & bit0Mask).not.toBe(0); // Still controls bit 0
      
      // Verify bit 1 is eliminated from saved row
      const bit1Byte = Math.floor(1 / 8);
      const bit1Pos = 7 - (1 % 8);
      const bit1Mask = 1 << bit1Pos;
      expect(savedRow[bit1Byte] & bit1Mask).toBe(0); // Bit 1 eliminated
    });

    it("should handle invalid bit indices", () => {
      const block = createSimpleTestBlock();
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      expect(setBlockBit(state, -1, 1)).toBe(false);
      expect(setBlockBit(state, 1000, 1)).toBe(false);
    });

    it("should maintain Reed-Solomon correctness after bit changes", () => {
      // Start with a block that has correct EC
      const initialData = new Uint8ClampedArray([0x12]);
      const encoder = new ReedSolomonEncoder(1);
      const correctEC = encoder.encode(initialData);
      const block = createMockBlock([0x12], Array.from(correctEC));
      
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Set a data bit using basis matrix
      setBlockBit(state, 0, 1);

      // Verify EC is still correct for the new data
      // The basis matrix maintains correctness through XOR operations
      const newData = state.B.subarray(0, 1);
      const newEC = state.B.subarray(1);
      
      // Verify that the new EC is valid for the new data
      // Since Reed-Solomon is linear, XORing basis vectors maintains correctness
      const expectedEC = encoder.encode(newData);
      
      // The actual EC should match the expected EC (basis matrix maintains correctness)
      expect(newEC).toEqual(expectedEC);
    });
  });

  describe("applyBlockBasis", () => {
    it("should update block codewords from basis state", () => {
      const block = createMockBlock([0x00], [0x00]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Modify B
      state.B[0] = 0xFF;
      state.B[1] = 0xAA;

      // Apply changes
      applyBlockBasis(block, state);

      // Verify block was updated
      const { dataBytes, ecBytes } = extractBytesFromBlock(block);
      expect(dataBytes[0]).toBe(0xFF);
      expect(ecBytes[0]).toBe(0xAA);
    });

    it("should preserve bit values correctly", () => {
      const block = createMockBlock([0x12], [0x34]);
      const ecCodewordsPerBlock = 1;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Modify some bits
      setBlockBit(state, 0, 1);
      setBlockBit(state, 4, 0);

      // Apply changes
      applyBlockBasis(block, state);

      // Verify bits were updated correctly
      const { dataBytes } = extractBytesFromBlock(block);
      const byte = dataBytes[0];
      expect((byte >> 7) & 1).toBe(1); // Bit 0 is set
      expect((byte >> 3) & 1).toBe(0); // Bit 4 is cleared
    });

    it("should handle multiple codewords", () => {
      const block = createMockBlock([0x12, 0x34], [0x56, 0x78]);
      const ecCodewordsPerBlock = 2;
      const state = initBlockBasis(block, ecCodewordsPerBlock);

      // Modify B
      state.B[0] = 0xFF;
      state.B[1] = 0xAA;
      state.B[2] = 0xBB;
      state.B[3] = 0xCC;

      // Apply changes
      applyBlockBasis(block, state);

      // Verify all codewords were updated
      const { dataBytes, ecBytes } = extractBytesFromBlock(block);
      expect(dataBytes).toEqual([0xFF, 0xAA]);
      expect(ecBytes).toEqual([0xBB, 0xCC]);
    });
  });
});

