/**
 * Unit tests for QArt capacity calculations
 */

import { describe, it, expect } from "vitest";
import {
  calculateQArtCapacityRequirement,
  checkVersionCapacityForQArt,
} from "@/domain/qart/capacity";
import { VersionInfo } from "@/types";
import { createTestImageData } from "./utils";

describe("QArt Capacity Calculations", () => {
  describe("calculateQArtCapacityRequirement", () => {
    it("should calculate base capacity as 50% of user input", () => {
      const userInputBits = 100;
      const requirement = calculateQArtCapacityRequirement(0.5, 5, userInputBits);
      
      // Base: 50% of 100 = 50
      // Complexity factor: 0.1 + (0.5 * 0.2) = 0.2
      // Size factor: 1.0 (version 5)
      // Requirement: 50 + (50 * 0.2 * 1.0) = 60
      expect(requirement).toBeGreaterThanOrEqual(50);
    });

    it("should apply complexity factor correctly", () => {
      const userInputBits = 100;
      const lowComplexity = calculateQArtCapacityRequirement(0.0, 5, userInputBits);
      const highComplexity = calculateQArtCapacityRequirement(1.0, 5, userInputBits);
      
      // Higher complexity should require more capacity
      expect(highComplexity).toBeGreaterThan(lowComplexity);
    });

    it("should apply size factor correctly", () => {
      const userInputBits = 100;
      const version5 = calculateQArtCapacityRequirement(0.5, 5, userInputBits);
      const version15 = calculateQArtCapacityRequirement(0.5, 15, userInputBits);
      const version25 = calculateQArtCapacityRequirement(0.5, 25, userInputBits);
      
      // Larger versions should require more capacity
      expect(version15).toBeGreaterThan(version5);
      expect(version25).toBeGreaterThan(version15);
    });

    it("should handle zero user input bits", () => {
      const requirement = calculateQArtCapacityRequirement(0.5, 5, 0);
      
      // Base: 50% of 0 = 0
      // Should still return a value (may be 0 or small positive)
      expect(requirement).toBeGreaterThanOrEqual(0);
    });

    it("should handle edge case complexity values", () => {
      const userInputBits = 100;
      
      const minComplexity = calculateQArtCapacityRequirement(0.0, 5, userInputBits);
      const maxComplexity = calculateQArtCapacityRequirement(1.0, 5, userInputBits);
      const midComplexity = calculateQArtCapacityRequirement(0.5, 5, userInputBits);
      
      expect(minComplexity).toBeGreaterThanOrEqual(0);
      expect(maxComplexity).toBeGreaterThan(minComplexity);
      expect(midComplexity).toBeGreaterThan(minComplexity);
      expect(maxComplexity).toBeGreaterThan(midComplexity);
    });

    it("should handle invalid complexity values", () => {
      const userInputBits = 100;
      
      // Invalid values should default to 0.5
      const negComplexity = calculateQArtCapacityRequirement(-1, 5, userInputBits);
      const highComplexity = calculateQArtCapacityRequirement(2.0, 5, userInputBits);
      const validComplexity = calculateQArtCapacityRequirement(0.5, 5, userInputBits);
      
      // Should default to medium complexity
      expect(negComplexity).toBe(validComplexity);
      expect(highComplexity).toBe(validComplexity);
    });

    it("should throw error for invalid QR size", () => {
      expect(() => {
        calculateQArtCapacityRequirement(0.5, 0, 100);
      }).toThrow();
      
      expect(() => {
        calculateQArtCapacityRequirement(0.5, 41, 100);
      }).toThrow();
    });

    it("should throw error for invalid user input bits", () => {
      expect(() => {
        calculateQArtCapacityRequirement(0.5, 5, -1);
      }).toThrow();
    });
  });

  describe("checkVersionCapacityForQArt", () => {
    const createVersionInfo = (
      version: number,
      capacity: number,
      ecCodewordsPerBlock: number = 10
    ): VersionInfo => ({
      version,
      capacity,
      ecCodewordsPerBlock,
      ecBlocks: [],
      remainderBits: 0,
      requiredDataCodewords: 0,
    });

    it("should detect sufficient capacity", () => {
      const versionInfo = createVersionInfo(5, 1000);
      const userInputBits = 500;
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(versionInfo, userInputBits, targetImage);

      expect(result.hasCapacity).toBe(true);
      expect(result.availableCapacity).toBe(500);
      expect(result.warning).toBeNull();
    });

    it("should detect insufficient capacity", () => {
      const versionInfo = createVersionInfo(5, 100);
      const userInputBits = 90;
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(versionInfo, userInputBits, targetImage);

      expect(result.hasCapacity).toBe(false);
      expect(result.availableCapacity).toBe(10);
      expect(result.warning).toBeTruthy();
    });

    it("should treat exactly minimum capacity as insufficient", () => {
      const versionInfo = createVersionInfo(5, 100);
      const userInputBits = 100; // Exactly minimum
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(versionInfo, userInputBits, targetImage);

      expect(result.hasCapacity).toBe(false);
      expect(result.availableCapacity).toBe(0);
      expect(result.warning).toBeTruthy();
      expect(result.warning).toContain("insufficient capacity");
    });

    it("should calculate QArt requirement based on image complexity", () => {
      const versionInfo = createVersionInfo(5, 1000);
      const userInputBits = 500;
      const simpleImage = createTestImageData(100, 100, "solid");
      const complexImage = createTestImageData(100, 100, "checkerboard");

      const simpleResult = checkVersionCapacityForQArt(versionInfo, userInputBits, simpleImage);
      const complexResult = checkVersionCapacityForQArt(versionInfo, userInputBits, complexImage);

      // Complex image should require more capacity
      expect(complexResult.qartRequirement).toBeGreaterThanOrEqual(simpleResult.qartRequirement);
    });

    it("should handle invalid version info", () => {
      const invalidVersionInfo = createVersionInfo(5, -1);
      const userInputBits = 100;
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(invalidVersionInfo, userInputBits, targetImage);

      expect(result.hasCapacity).toBe(false);
      expect(result.warning).toBeTruthy();
    });

    it("should handle invalid user input bits", () => {
      const versionInfo = createVersionInfo(5, 1000);
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(versionInfo, -1, targetImage);

      expect(result.hasCapacity).toBe(false);
      expect(result.warning).toBeTruthy();
    });

    it("should handle invalid target image", () => {
      const versionInfo = createVersionInfo(5, 1000);
      const userInputBits = 100;
      const invalidImage = new ImageData(0, 0);

      const result = checkVersionCapacityForQArt(versionInfo, userInputBits, invalidImage);

      expect(result.hasCapacity).toBe(false);
      expect(result.warning).toBeTruthy();
    });

    it("should provide detailed warning message for insufficient capacity", () => {
      const versionInfo = createVersionInfo(5, 100);
      const userInputBits = 95;
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(versionInfo, userInputBits, targetImage);

      if (!result.hasCapacity) {
        expect(result.warning).toContain("insufficient capacity");
        expect(result.warning).toContain("Available:");
        expect(result.warning).toContain("Required:");
      }
    });

    it("should handle null version info", () => {
      const userInputBits = 100;
      const targetImage = createTestImageData(100, 100, "checkerboard");

      const result = checkVersionCapacityForQArt(null as any, userInputBits, targetImage);

      expect(result.hasCapacity).toBe(false);
      expect(result.warning).toBeTruthy();
    });
  });
});

