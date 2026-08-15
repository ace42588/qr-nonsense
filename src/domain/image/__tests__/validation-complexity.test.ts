import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  MAX_IMAGE_FILE_SIZE,
  detectExtremeScaling,
  calculateImageComplexity,
} from "@/domain/image";
import { createTestImageData } from "@/domain/qart/__tests__/utils";

describe("validateImageFile", () => {
  it("rejects files over 10MB", () => {
    const error = validateImageFile({
      size: MAX_IMAGE_FILE_SIZE + 1,
      type: "image/png",
      name: "big.png",
    });
    expect(error).toMatch(/10MB/);
  });

  it("rejects unsupported MIME types", () => {
    const error = validateImageFile({
      size: 100,
      type: "image/bmp",
      name: "x.bmp",
    });
    expect(error).toMatch(/Unsupported image type/);
  });

  it("accepts JPEG, PNG, GIF, and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/gif", "image/webp"]) {
      expect(validateImageFile({ size: 100, type, name: "ok" })).toBeNull();
    }
  });

  it("falls back to file extension when MIME is missing", () => {
    expect(validateImageFile({ size: 100, type: "", name: "photo.jpg" })).toBeNull();
    expect(validateImageFile({ size: 100, type: "", name: "photo.bmp" })).toMatch(
      /Unsupported/
    );
  });
});

describe("detectExtremeScaling", () => {
  it("warns when an image will be scaled into mush", () => {
    const tiny = detectExtremeScaling(0.05);
    expect(tiny.isExtreme).toBe(true);
    expect(tiny.warning).toMatch(/down/);

    const huge = detectExtremeScaling(12);
    expect(huge.isExtreme).toBe(true);
    expect(huge.warning).toMatch(/up/);

    expect(detectExtremeScaling(1).isExtreme).toBe(false);
  });
});

describe("calculateImageComplexity", () => {
  it("scores a checkerboard higher than a solid field at QR resolution", () => {
    const qrDimension = 5 * 4 + 17; // version 5
    const simple = calculateImageComplexity(
      createTestImageData(100, 100, "solid"),
      qrDimension
    );
    const complex = calculateImageComplexity(
      createTestImageData(100, 100, "checkerboard"),
      qrDimension
    );
    expect(complex).toBeGreaterThan(simple);
  });
});
