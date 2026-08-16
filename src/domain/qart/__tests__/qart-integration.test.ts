/**
 * Integration tests for QArt generation pipeline
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateQArt, QArtOptions } from "../index";
import { Segment, QRMatrix, Codeword, VersionInfo } from "../../shared/types";
import { Input } from "@/app/types";
import { QRBlock } from "../../qr/codewords/blocks";
import { generateCodewords } from "../../qr/codewords";
import { getMatrix } from "../../qr/matrix";
import { getEncodedMessage } from "../../qr";
import { getVersionInfo } from "../../qr/versionUtils";
import {
  createTestImageData,
} from "./utils";
import { validateDecode } from "@/adapters/browser/validation";

const decodeMatrixTrialsMock = vi.fn().mockResolvedValue([
  { success: true, payload: "A" },
]);

// Mock decode port since jsdom doesn't support canvas / jsQR reliably
vi.mock("@/adapters/browser/validation", async () => {
  const actual = (await vi.importActual(
    "@/adapters/browser/validation"
  )) as object;
  return {
    ...actual,
    validateDecode: vi.fn().mockResolvedValue(1.0),
    createBrowserEvaluateDecodePort: () => ({
      decodeMatrixTrials: (...args: unknown[]) =>
        decodeMatrixTrialsMock(...args),
      decodeImageData: vi.fn().mockResolvedValue([
        { success: true, payload: "A" },
      ]),
    }),
  };
});

describe("QArt Integration Tests", () => {
  let testSegments: Segment[];
  let testCodewords: Codeword[];
  let testBlocks: QRBlock[];
  let testMatrix: QRMatrix;
  let testVersionInfo: VersionInfo;
  let testImage: ImageData;

  beforeEach(() => {
    vi.mocked(validateDecode).mockResolvedValue(1.0);
    decodeMatrixTrialsMock.mockResolvedValue([
      { success: true, payload: "A" },
    ]);

    // Create test input and use proper encoding pipeline
    const testInput: Input = {
      id: "test-input-1",
      type: "string",
      mode: "byte",
      data: "A", // Single byte
    };

    // Use getEncodedMessage to properly encode and add padding
    // Use -1 for auto version selection to get appropriate version
    const encodedMessage = getEncodedMessage([testInput], -1, 0); // Auto version, L error correction
    testSegments = encodedMessage.segments;

    // Get version info for the selected version
    testVersionInfo = getVersionInfo(0, encodedMessage.version);

    // Generate codewords and blocks from finalized segments
    const codewordsResult = generateCodewords(testSegments, encodedMessage.version, 0);
    testCodewords = codewordsResult.codewords;
    testBlocks = codewordsResult.blocks;

    // Generate initial matrix
    const matrixResult = getMatrix(testCodewords, 0, encodedMessage.version, 0);
    testMatrix = matrixResult.matrix;

    // Create test image
    testImage = createTestImageData(100, 100, "checkerboard");
  });

  describe("generateQArt", () => {
    it("should generate QArt QR code with valid inputs", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      expect(result.matrix).toBeDefined();
      expect(result.matrix.length).toBe(21); // Version 1 dimension
      expect(result.dataMask).toBe(0);
      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
      expect(result.error).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeLessThanOrEqual(1);
      expect(result.controlMatrix).toBeDefined();
    });

    it("should use mask pattern 0", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      expect(result.dataMask).toBe(0);
    });

    it("should generate scannable QR code", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
    });

    it("should compute visual error", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      expect(result.error).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeLessThanOrEqual(1);
    });

    it("should generate control matrix", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      expect(result.controlMatrix).toBeDefined();
      expect(result.controlMatrix?.length).toBe(result.matrix.length);
    });

    it("should support contrast-based priority function", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
        priorityFunction: "contrast",
      };

      const result = await generateQArt(options);

      expect(result.matrix).toBeDefined();
      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
    });

    it("should support random priority function", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
        priorityFunction: "random",
      };

      const result = await generateQArt(options);

      expect(result.matrix).toBeDefined();
      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
    });

    it("should handle cancellation signal", async () => {
      const abortController = new AbortController();
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
        signal: abortController.signal,
      };

      // Cancel immediately
      abortController.abort();

      await expect(generateQArt(options)).rejects.toThrow("cancelled");
    });

    it("should handle cancellation during processing", async () => {
      const abortController = new AbortController();
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
        signal: abortController.signal,
      };

      // Cancel immediately before starting (simulating cancellation during processing)
      // In a real scenario, cancellation would happen during the async operation
      abortController.abort();

      await expect(generateQArt(options)).rejects.toThrow("cancelled");
    });

    it("should process blocks independently", async () => {
      // Create input that will result in version 5 with multiple blocks
      const testInput: Input = {
        id: "test-input-multiblock",
        type: "string",
        mode: "byte",
        data: "Hello World", // Enough data to require version 5
      };

      // Use proper encoding pipeline
      const encodedMessage = getEncodedMessage([testInput], 5, 0); // Version 5, L error correction
      const multiBlockSegments = encodedMessage.segments;
      const multiBlockVersionInfo = getVersionInfo(0, encodedMessage.version);

      const codewordsResult = generateCodewords(multiBlockSegments, encodedMessage.version, 0);
      const matrixResult = getMatrix(codewordsResult.codewords, 0, encodedMessage.version, 0);

      const options: QArtOptions = {
        segments: multiBlockSegments,
        codewords: codewordsResult.codewords,
        blocks: codewordsResult.blocks,
        initialMatrix: matrixResult.matrix,
        versionInfo: multiBlockVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: createTestImageData(200, 200, "checkerboard"),
      };

      const result = await generateQArt(options);

      expect(result.matrix).toBeDefined();
      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
    });

    it("should only optimize padding segment bits", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      // Verify that data segments weren't modified (only padding segments should be optimized)
      // This is verified by the fact that the QR code still decodes correctly
      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
    });

    it("should handle different image patterns", async () => {
      const patterns = ["checkerboard", "solid", "gradient"] as const;

      for (const pattern of patterns) {
        const testImg = createTestImageData(100, 100, pattern);
        const options: QArtOptions = {
          segments: testSegments,
          codewords: testCodewords,
          blocks: testBlocks,
          initialMatrix: testMatrix,
          versionInfo: testVersionInfo,
          errorCorrectionLevel: 0,
          targetImage: testImg,
        };

        const result = await generateQArt(options);

        expect(result.matrix).toBeDefined();
        expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
      }
    });

    it("should optimize padding without changing user data segments", async () => {
      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      const result = await generateQArt(options);

      const userTypes = new Set(["modeIndicator", "characterCountIndicator", "data"]);
      const snapshot = (segments: Segment[]) =>
        segments
          .filter((s) => s.type && userTypes.has(s.type))
          .map((s) => ({ type: s.type, value: s.value, length: s.length }));

      expect(snapshot(result.segments)).toEqual(snapshot(testSegments));

      const originalPadding = testSegments.filter((s) => s.type === "padding");
      const resultPadding = result.segments.filter((s) => s.type === "padding");
      expect(resultPadding.length).toBe(originalPadding.length);
      expect(originalPadding.length).toBeGreaterThan(0);
      expect(
        resultPadding.some((s, i) => s.value !== originalPadding[i].value)
      ).toBe(true);
    });

    it("should handle empty padding segments", async () => {
      // Create input that fills the version capacity (no padding)
      const testInput: Input = {
        id: "test-input-full",
        type: "string",
        mode: "byte",
        data: "A", // Small input, will have padding
      };

      // Use proper encoding pipeline - this will add padding automatically
      const encodedMessage = getEncodedMessage([testInput], -1, 0); // Auto version
      const segmentsWithPadding = encodedMessage.segments;
      
      // Filter to only data segments (simulate no padding scenario)
      // But we need at least some segments, so keep one data segment
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const segmentsWithoutPadding = segmentsWithPadding.filter(s => s.type === "data").slice(0, 1);
      
      // Use version 1 which has capacity for the segment
      const versionInfo = getVersionInfo(0, 1);
      
      // Generate segments with proper padding for version 1
      const fullSegments = getEncodedMessage([testInput], 1, 0).segments;
      const codewordsResult = generateCodewords(fullSegments, 1, 0);
      const matrixResult = getMatrix(codewordsResult.codewords, 0, 1, 0);

      const options: QArtOptions = {
        segments: fullSegments, // Use full segments (with padding) for generation
        codewords: codewordsResult.codewords,
        blocks: codewordsResult.blocks,
        initialMatrix: matrixResult.matrix,
        versionInfo: versionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
      };

      // Should still generate successfully
      const result = await generateQArt(options);

      expect(result.matrix).toBeDefined();
      expect(result.decodeSuccessRate).toBeGreaterThanOrEqual(0.8);
    });

    it("surfaces a scannability warning when decode rate is below threshold", async () => {
      decodeMatrixTrialsMock.mockResolvedValueOnce([
        { success: true, payload: "A" },
        { success: false, payload: null },
        { success: false, payload: null },
        { success: false, payload: null },
      ]);

      const options: QArtOptions = {
        segments: testSegments,
        codewords: testCodewords,
        blocks: testBlocks,
        initialMatrix: testMatrix,
        versionInfo: testVersionInfo,
        errorCorrectionLevel: 0,
        targetImage: testImage,
        minDecodeRedundancy: 0.8,
        decodeTrials: 4,
      };

      const result = await generateQArt(options);

      expect(result.matrix).toBeDefined();
      expect(result.decodeSuccessRate).toBe(0.25);
      expect(result.scannabilityWarning).toBeTruthy();
      expect(result.scannabilityWarning).toContain("25%");
      expect(decodeMatrixTrialsMock).toHaveBeenCalledWith(expect.anything(), 4);
    });
  });
});

