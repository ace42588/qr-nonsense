import { describe, it, expect } from "vitest";
import {
  mapQrCoordToImagePixel,
  sampleQrModule,
  rasterizeImageToQRGrid,
  calculateImageComplexity,
} from "@/domain/image";
import {
  sampleImageAtPoint,
  sampleImageAcrossModule,
} from "@/domain/halftone/rendering";
import { createTestImageData } from "@/domain/qart/__tests__/utils";

function setPixel(
  image: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number
) {
  const idx = (y * image.width + x) * 4;
  image.data[idx] = r;
  image.data[idx + 1] = g;
  image.data[idx + 2] = b;
  image.data[idx + 3] = 255;
}

function grayImage(size: number, value: number): ImageData {
  const image = createTestImageData(size, size, "solid");
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
  }
  return image;
}

describe("shared QR image sampling pipeline", () => {
  it("mapQrCoordToImagePixel sends module center to the center pixel of a 2x2 cell", () => {
    // 4x4 image, 2x2 QR: module (0,0) covers pixels [0,2) x [0,2)
    const center = mapQrCoordToImagePixel(0.5, 0.5, 2, 4, 4);
    expect(center).toEqual({ x: 1, y: 1 });

    const corner = mapQrCoordToImagePixel(0, 0, 2, 4, 4);
    expect(corner).toEqual({ x: 0, y: 0 });
  });

  it("sampleQrModule center reads the module center, not the top-left corner", () => {
    const image = grayImage(4, 128);
    setPixel(image, 0, 0, 0, 0, 0);
    setPixel(image, 1, 1, 255, 255, 255);

    const { brightness } = sampleQrModule(image, 2, 0, 0, { mode: "center" });
    expect(brightness).toBeCloseTo(1, 5);
  });

  it("rasterizeImageToQRGrid is sampleQrModule center for every module", () => {
    const image = grayImage(4, 128);
    setPixel(image, 0, 0, 0, 0, 0);
    setPixel(image, 1, 1, 255, 255, 255);

    const grid = rasterizeImageToQRGrid(image, 2);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const { brightness } = sampleQrModule(image, 2, x, y, { mode: "center" });
        expect(grid[y * 2 + x]).toBeCloseTo(brightness, 5);
      }
    }
    expect(grid[0]).toBeCloseTo(1, 5);
  });

  it("Halftone wrappers share the same pipeline as QArt rasterize", () => {
    const image = grayImage(4, 128);
    setPixel(image, 1, 1, 255, 255, 255);
    const importance = new Array(16).fill(0.25);

    const fromQArt = sampleQrModule(image, 2, 0, 0, {
      mode: "center",
      importanceMap: importance,
    });
    const fromHqr = sampleImageAtPoint(image, importance, 2, 0, 0);
    const grid = rasterizeImageToQRGrid(image, 2);

    expect(fromHqr.brightness).toBeCloseTo(fromQArt.brightness, 5);
    expect(fromHqr.importance).toBeCloseTo(fromQArt.importance, 5);
    expect(fromHqr.brightness).toBeCloseTo(grid[0], 5);
  });

  it("area sampling averages sub-pixel centers inside the module", () => {
    const image = grayImage(4, 255);
    setPixel(image, 0, 0, 0, 0, 0);

    const { brightness } = sampleQrModule(image, 2, 0, 0, {
      mode: "area",
      modulePixel: 2,
    });
    const viaWrapper = sampleImageAcrossModule(
      image,
      new Array(16).fill(0),
      2,
      0,
      0,
      2
    );

    expect(brightness).toBeGreaterThan(0.5);
    expect(viaWrapper.brightness).toBeCloseTo(brightness, 5);
  });

  it("calculateImageComplexity uses the same rasterized grid QArt sees", () => {
    const qrDimension = 5 * 4 + 17;
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
