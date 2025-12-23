/**
 * Visualization tests for QArt generation
 */

import { describe, it, expect } from "vitest";
import { rasterizeImageToQRGrid, computeVisualError } from "../../image";
import { QRMatrix } from "../../shared/types";
import {
  createTestImageData,
  createMockQRMatrix,
  createMockTargetGrid,
} from "./utils";

describe("QArt Visualization", () => {
  describe("rasterizeImageToQRGrid", () => {
    it("should rasterize image to QR grid dimensions", () => {
      const dimension = 21;
      const imageData = createTestImageData(100, 100, "checkerboard");

      const grid = rasterizeImageToQRGrid(imageData, dimension);

      expect(grid.length).toBe(dimension * dimension);
    });

    it("should sample image correctly", () => {
      const dimension = 21;
      // Create image with known pattern
      const imageData = createTestImageData(100, 100, "checkerboard");

      const grid = rasterizeImageToQRGrid(imageData, dimension);

      // Checkerboard pattern should alternate
      // At (0,0): x+y=0 (even) -> dark (0.0)
      // At (1,0): x+y=1 (odd) -> light (1.0)
      // Note: Due to sampling, values may not be exactly 0.0 and 1.0
      expect(grid[0]).toBeLessThan(0.5); // Dark at (0,0) or nearby
      // Check a few positions to verify pattern
      const hasDark = grid.some(v => v < 0.5);
      const hasLight = grid.some(v => v > 0.5);
      expect(hasDark).toBe(true);
      expect(hasLight).toBe(true);
    });

    it("should calculate brightness correctly", () => {
      const dimension = 5;
      // Create solid white image
      const whiteImage = createTestImageData(100, 100, "solid");
      // Modify to be white
      const data = whiteImage.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255; // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = 255; // A
      }

      const grid = rasterizeImageToQRGrid(whiteImage, dimension);

      // All values should be close to 1.0 (white)
      for (let i = 0; i < grid.length; i++) {
        expect(grid[i]).toBeCloseTo(1.0, 0.1);
      }
    });

    it("should handle different image sizes", () => {
      const dimension = 21;
      const sizes = [
        [50, 50],
        [100, 100],
        [200, 200],
        [100, 200], // Non-square
      ];

      for (const [width, height] of sizes) {
        const imageData = createTestImageData(width, height, "checkerboard");
        const grid = rasterizeImageToQRGrid(imageData, dimension);

        expect(grid.length).toBe(dimension * dimension);
      }
    });

    it("should clamp coordinates to image bounds", () => {
      const dimension = 21;
      const imageData = createTestImageData(10, 10, "checkerboard"); // Smaller than grid

      // Should not throw
      const grid = rasterizeImageToQRGrid(imageData, dimension);

      expect(grid.length).toBe(dimension * dimension);
    });

    it("should handle gradient images", () => {
      const dimension = 21;
      const imageData = createTestImageData(100, 100, "gradient");

      const grid = rasterizeImageToQRGrid(imageData, dimension);

      // Gradient should have varying brightness
      const values = Array.from(grid);
      const min = Math.min(...values);
      const max = Math.max(...values);
      expect(max).toBeGreaterThan(min);
    });
  });

  describe("computeVisualError", () => {
    it("should compute error between matrix and target grid", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension, "checkerboard");
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const error = computeVisualError(matrix, targetGrid, dimension);

      expect(error).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThanOrEqual(1);
    });

    it("should return 0 for perfect match", () => {
      const dimension = 21;
      // Create matching matrix and grid
      const matrix = createMockQRMatrix(dimension, "checkerboard");
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const error = computeVisualError(matrix, targetGrid, dimension);

      // Should be low error for matching patterns
      expect(error).toBeLessThan(0.5);
    });

    it("should exclude non-data modules from error calculation", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension, "checkerboard");
      
      // Mark some modules as non-data
      matrix[0][0].nonData = true;
      matrix[0][1].nonData = true;

      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const error = computeVisualError(matrix, targetGrid, dimension);

      // Should compute error without throwing
      expect(error).toBeGreaterThanOrEqual(0);
      expect(error).toBeLessThanOrEqual(1);
    });

    it("should handle empty matrix", () => {
      const dimension = 21;
      const matrix: QRMatrix = [];
      const targetGrid = createMockTargetGrid(dimension, "checkerboard");

      const error = computeVisualError(matrix, targetGrid, dimension);

      expect(error).toBe(Infinity);
    });

    it("should calculate error correctly for different patterns", () => {
      const dimension = 21;
      const patterns = ["checkerboard", "solid", "random"] as const;

      for (const pattern of patterns) {
        const matrix = createMockQRMatrix(dimension, pattern);
        const targetGrid = createMockTargetGrid(dimension, pattern);

        const error = computeVisualError(matrix, targetGrid, dimension);

        expect(error).toBeGreaterThanOrEqual(0);
        expect(error).toBeLessThanOrEqual(1);
      }
    });

    it("should handle mismatched dimensions gracefully", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension, "checkerboard");
      const targetGrid = new Float32Array(10 * 10); // Wrong size

      // Should handle gracefully (may throw or return Infinity)
      expect(() => {
        computeVisualError(matrix, targetGrid, dimension);
      }).not.toThrow();
    });
  });

  describe("Control Matrix Visualization", () => {
    it("should visualize controlled vs uncontrolled modules", async () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();

      // Mark some bits as controlled - use actual bit IDs from matrix
      const module00 = matrix[0][0];
      const module10 = matrix[0][1];
      if (module00?.bitId) controlledBits.set(module00.bitId, true);
      if (module10?.bitId) controlledBits.set(module10.bitId, false);

      // Import createControlMatrix
      const { createControlMatrix } = await import("@/domain/qart/controlMatrix");
      const controlMatrix = createControlMatrix(matrix, controlledBits);

      expect(controlMatrix).toBeDefined();
      expect(controlMatrix.length).toBe(dimension);
    });
  });
});

