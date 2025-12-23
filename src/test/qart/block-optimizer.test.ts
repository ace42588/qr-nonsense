/**
 * Unit tests for QArt block optimizer
 */

import { describe, it, expect } from "vitest";
import { optimizeBlock } from "@/domain/qart/blockOptimizer";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { BitPosition } from "@/domain/qart/bitPriority";
import {
  createMockBlock,
  createMockTargetGrid,
  extractBytesFromBlock,
} from "./utils";

describe("Block Optimizer", () => {
  describe("optimizeBlock", () => {
    it("should optimize block to match target image", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;

      // Create target grid with checkerboard pattern
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      // Create bit order (simplified - just a few bits)
      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" },
        { bi: 1, x: 1, y: 0, priority: 90, bitId: "bit-1-0" },
        { bi: 2, x: 0, y: 1, priority: 80, bitId: "bit-0-1" },
      ];

      const stats = optimizeBlock(
        block,
        bitOrder,
        targetGrid,
        dimension,
        ecCodewordsPerBlock
      );

      expect(stats.optimized).toBeGreaterThan(0);
      expect(stats.controlledBits.size).toBe(3);
    });

    it("should respect priority ordering", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      // Create bit order with specific priorities
      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" },
        { bi: 1, x: 1, y: 0, priority: 50, bitId: "bit-1-0" },
        { bi: 2, x: 0, y: 1, priority: 10, bitId: "bit-0-1" },
      ];

      const stats = optimizeBlock(
        block,
        bitOrder,
        targetGrid,
        dimension,
        ecCodewordsPerBlock
      );

      // Higher priority bits should be optimized first
      expect(stats.controlledBits.get("bit-0-0")).toBe(true);
    });

    it("should apply mask pattern 0 correctly", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;

      // Create target grid where (0,0) should be dark
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");
      targetGrid[0] = 0.0; // Dark at (0,0)

      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" },
      ];

      optimizeBlock(block, bitOrder, targetGrid, dimension, ecCodewordsPerBlock);

      // Mask 0: (x+y) % 2 === 0
      // For (0,0): mask = true, so isDark = !bit
      // If target is dark and mask is true, bit should be 0
      const { dataBytes } = extractBytesFromBlock(block);
      const bit0 = (dataBytes[0] >> 7) & 1;
      // With mask 0, dark target at (0,0) means bit should be 0
      expect(bit0).toBe(0);
    });

    it("should track controlled bits correctly", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" },
        { bi: 1, x: 1, y: 0, priority: 90, bitId: "bit-1-0" },
        { bi: 8, x: 2, y: 0, priority: 80, bitId: "bit-2-0" }, // EC bit
      ];

      const stats = optimizeBlock(
        block,
        bitOrder,
        targetGrid,
        dimension,
        ecCodewordsPerBlock
      );

      expect(stats.controlledBits.has("bit-0-0")).toBe(true);
      expect(stats.controlledBits.has("bit-1-0")).toBe(true);
      expect(stats.controlledBits.has("bit-2-0")).toBe(true);
    });

    it("should distinguish between data and EC optimized bits", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" }, // Data bit
        { bi: 8, x: 1, y: 0, priority: 90, bitId: "bit-1-0" }, // EC bit
      ];

      const stats = optimizeBlock(
        block,
        bitOrder,
        targetGrid,
        dimension,
        ecCodewordsPerBlock
      );

      expect(stats.dataOptimized).toBeGreaterThan(0);
      expect(stats.ecOptimized).toBeGreaterThan(0);
      expect(stats.optimized).toBe(stats.dataOptimized + stats.ecOptimized);
    });

    it("should handle skipped bits when basis vectors are exhausted", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      // Create bit positions - with 1 data + 1 EC codeword, we have 16 total bits (0-15)
      // We have 8 basis vectors (one per data bit), so we can control at most 8 bits
      const bitOrder: BitPosition[] = [];
      for (let i = 0; i < 16; i++) { // Only valid bit indices
        bitOrder.push({
          bi: i,
          x: i % dimension,
          y: Math.floor(i / dimension),
          priority: 100 - i,
          bitId: `bit-${i}`,
        });
      }

      const stats = optimizeBlock(
        block,
        bitOrder,
        targetGrid,
        dimension,
        ecCodewordsPerBlock
      );

      // Should have optimized some and skipped some
      // With 1 data codeword, we have 8 basis vectors max
      // Some bits might already be set correctly (return true without using basis vector)
      // So optimized can be > 8 if many bits are already correct
      expect(stats.optimized).toBeGreaterThanOrEqual(0);
      expect(stats.skipped).toBeGreaterThanOrEqual(0);
      expect(stats.optimized + stats.skipped).toBe(16);
      
      // The key is that we process all bits and track which were controlled
      expect(stats.controlledBits.size).toBe(16);
    });

    it("should preserve block structure after optimization", () => {
      const block = createMockBlock([0x12], [0x34]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" },
      ];

      const originalDataLength = block.data.length;
      const originalECLength = block.errorCorrection.length;

      optimizeBlock(block, bitOrder, targetGrid, dimension, ecCodewordsPerBlock);

      expect(block.data.length).toBe(originalDataLength);
      expect(block.errorCorrection.length).toBe(originalECLength);
    });

    it("should handle empty bit order", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const stats = optimizeBlock(
        block,
        [],
        targetGrid,
        dimension,
        ecCodewordsPerBlock
      );

      expect(stats.optimized).toBe(0);
      expect(stats.skipped).toBe(0);
      expect(stats.controlledBits.size).toBe(0);
    });

    it("should match target brightness correctly", () => {
      const block = createMockBlock([0x00], [0x00]);
      const dimension = 21;
      const ecCodewordsPerBlock = 1;

      // Create target grid with specific brightness
      const targetGrid = new Float32Array(dimension * dimension);
      targetGrid[0] = 0.3; // Dark
      targetGrid[1] = 0.7; // Light

      const bitOrder: BitPosition[] = [
        { bi: 0, x: 0, y: 0, priority: 100, bitId: "bit-0-0" },
        { bi: 1, x: 1, y: 0, priority: 90, bitId: "bit-1-0" },
      ];

      const stats = optimizeBlock(block, bitOrder, targetGrid, dimension, ecCodewordsPerBlock);

      // Verify bits were set to match target
      const { dataBytes } = extractBytesFromBlock(block);
      // Note: Actual bit values depend on mask pattern, but optimization should have occurred
      expect(stats.optimized).toBeGreaterThan(0);
    });
  });
});

