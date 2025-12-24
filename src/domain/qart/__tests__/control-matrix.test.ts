/**
 * Unit tests for QArt control matrix visualization
 */

import { describe, it, expect } from "vitest";
import { createControlMatrix } from "../controlMatrix";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { QRMatrix } from "../../shared/types";
import {
  createMockQRMatrix,
} from "./utils";

describe("Control Matrix", () => {
  describe("createControlMatrix", () => {
    it("should create control matrix with same dimensions", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      expect(controlMatrix.length).toBe(dimension);
      expect(controlMatrix[0].length).toBe(dimension);
    });

    it("should mark controlled modules as normal", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();
      
      // Mark some bits as controlled - use actual bit IDs from matrix
      const module00 = matrix[0][0];
      const module10 = matrix[0][1];
      if (module00?.bitId) controlledBits.set(module00.bitId, true);
      if (module10?.bitId) controlledBits.set(module10.bitId, true);

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      // Controlled modules should be shown normally (no gray)
      const result00 = controlMatrix[0][0];
      const result10 = controlMatrix[0][1];
      
      expect(result00).toBeDefined();
      expect(result10).toBeDefined();
      // Controlled modules should not have _controlGray set
      if (result00 && !result00.nonData) {
        expect((result00 as any)._controlGray).toBeUndefined();
      }
      if (result10 && !result10.nonData) {
        expect((result10 as any)._controlGray).toBeUndefined();
      }
    });

    it("should gray out uncontrolled modules", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();
      
      // Mark some bits as not controlled
      controlledBits.set("bit-0-0", false);
      controlledBits.set("bit-1-0", false);

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      // Uncontrolled modules should be grayed
      const module00 = controlMatrix[0][0];
      const module10 = controlMatrix[0][1];
      
      expect(module00).toBeDefined();
      expect(module10).toBeDefined();
      expect((module00 as any)._controlGray).toBe(0xbfbfbf);
      expect((module10 as any)._controlGray).toBe(0xbfbfbf);
    });

    it("should gray out non-data modules", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      
      // Mark a module as non-data
      matrix[0][0].nonData = true;
      
      const controlledBits = new Map<string, boolean>();
      controlledBits.set("bit-0-0", true); // Even if controlled

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      // Non-data modules should be grayed regardless
      const module00 = controlMatrix[0][0];
      expect((module00 as any)._controlGray).toBe(0x3f3f3f);
    });

    it("should handle modules without bit IDs", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      
      // Remove bit ID from a module (set to undefined to simulate missing bit)
      if (matrix[0][0]) {
        (matrix[0][0] as any).bit = undefined;
      }
      
      const controlledBits = new Map<string, boolean>();

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      // Should handle gracefully
      const module00 = controlMatrix[0][0];
      expect(module00).toBeDefined();
      expect((module00 as any)._controlGray).toBe(0xbfbfbf); // Uncontrolled
    });

    it("should preserve module properties", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();
      controlledBits.set("bit-0-0", true);

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      const module = controlMatrix[0][0];
      expect(module.x).toBe(0);
      expect(module.y).toBe(0);
      expect(module.isDark).toBeDefined();
      expect(module.id).toBeDefined();
    });

    it("should handle empty controlled bits map", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      // All modules should be grayed (uncontrolled)
      for (let y = 0; y < dimension; y++) {
        for (let x = 0; x < dimension; x++) {
          const module = controlMatrix[y][x];
          if (module && !module.nonData) {
            expect((module as any)._controlGray).toBe(0xbfbfbf);
          }
        }
      }
    });

    it("should handle mixed controlled/uncontrolled modules", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      const controlledBits = new Map<string, boolean>();
      
      // Mix of controlled and uncontrolled - use actual bit IDs from matrix
      const module00 = matrix[0][0];
      const module10 = matrix[0][1];
      const module20 = matrix[0][2];
      
      if (module00?.bitId) controlledBits.set(module00.bitId, true);
      if (module10?.bitId) controlledBits.set(module10.bitId, false);
      if (module20?.bitId) controlledBits.set(module20.bitId, true);

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      const result00 = controlMatrix[0][0];
      const result10 = controlMatrix[0][1];
      const result20 = controlMatrix[0][2];
      
      if (result00 && !result00.nonData) {
        expect((result00 as any)._controlGray).toBeUndefined();
      }
      if (result10 && !result10.nonData) {
        expect((result10 as any)._controlGray).toBe(0xbfbfbf);
      }
      if (result20 && !result20.nonData) {
        expect((result20 as any)._controlGray).toBeUndefined();
      }
    });

    it("should handle null modules", () => {
      const dimension = 21;
      const matrix = createMockQRMatrix(dimension);
      
      // Set some modules to null
      matrix[0][5] = null as any;
      matrix[3][7] = null as any;
      
      const controlledBits = new Map<string, boolean>();

      const controlMatrix = createControlMatrix(matrix, controlledBits);

      // Null modules should remain null
      expect(controlMatrix[0][5]).toBeNull();
      expect(controlMatrix[3][7]).toBeNull();
    });
  });
});

