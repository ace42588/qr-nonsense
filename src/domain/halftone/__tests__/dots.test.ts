import { describe, it, expect, vi } from "vitest";
import {
  clampDotSizes,
  dotDiameterForModule,
  renderHalftoneModule,
  DOT_SIZE_MAX,
} from "@/domain/halftone/rendering";
import { createTestImageData } from "@/domain/qart/__tests__/utils";

function grayImage(size: number, value: number): ImageData {
  const image = createTestImageData(size, size, "solid");
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
  }
  return image;
}

function mockCtx() {
  return {
    imageSmoothingEnabled: true,
    fillStyle: "",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("halftone dots diameter mapping", () => {
  const moduleSize = 10;
  const min = 0.25;
  const max = 1.0;

  it("maps dark modules: black image → max diameter, white → min", () => {
    expect(dotDiameterForModule(0, true, moduleSize, min, max)).toBeCloseTo(max * moduleSize);
    expect(dotDiameterForModule(1, true, moduleSize, min, max)).toBeCloseTo(min * moduleSize);
    expect(dotDiameterForModule(0.5, true, moduleSize, min, max)).toBeCloseTo(
      ((min + max) / 2) * moduleSize
    );
  });

  it("maps light modules: white image → max diameter, black → min", () => {
    expect(dotDiameterForModule(1, false, moduleSize, min, max)).toBeCloseTo(max * moduleSize);
    expect(dotDiameterForModule(0, false, moduleSize, min, max)).toBeCloseTo(min * moduleSize);
    expect(dotDiameterForModule(0.5, false, moduleSize, min, max)).toBeCloseTo(
      ((min + max) / 2) * moduleSize
    );
  });

  it("clamps so min ≤ max and values stay in [0, DOT_SIZE_MAX]", () => {
    expect(clampDotSizes(1.2, 0.3)).toEqual({ minDotSize: 0.3, maxDotSize: 1.2 });
    expect(clampDotSizes(-1, 2)).toEqual({ minDotSize: 0, maxDotSize: DOT_SIZE_MAX });
    expect(dotDiameterForModule(0, true, moduleSize, 1.0, 0.25)).toBeCloseTo(1.0 * moduleSize);
  });

  it("full-cover: maxDotSize = √2 yields diameter ≥ module diagonal", () => {
    const side = 20;
    const diagonal = side * Math.SQRT2;
    const diameter = dotDiameterForModule(0, true, side, 0, Math.SQRT2);
    expect(diameter).toBeGreaterThanOrEqual(diagonal - 1e-9);
  });
});

describe("renderHalftoneModule dots style", () => {
  it("pass 1 draws a circle without requiring pattern arrays", () => {
    const ctx = mockCtx();
    const image = grayImage(4, 0);
    const importanceMap = new Array(16).fill(1);

    expect(() => {
      renderHalftoneModule(
        ctx,
        { isDark: true, nonData: false },
        0,
        0,
        10,
        { size: 40, quietZone: 0, moduleX: 0, moduleY: 0, x: 0, y: 0, dimension: 2, pass: 1, passes: 2 },
        {
          transformedImageData: image,
          importanceMap,
          // Intentionally invalid / empty — dots must not need these
          patternsDark: [] as number[][][],
          patternsLight: [] as number[][][],
          modulePixel: 3,
          style: "dots",
          minDotSize: 0.25,
          maxDotSize: 1.0,
        }
      );
    }).not.toThrow();

    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("pass 0 fills background for dark modules without drawing a circle", () => {
    const ctx = mockCtx();
    const image = grayImage(4, 0);
    const importanceMap = new Array(16).fill(1);

    renderHalftoneModule(
      ctx,
      { isDark: true, nonData: false },
      0,
      0,
      10,
      { size: 40, quietZone: 0, moduleX: 0, moduleY: 0, x: 0, y: 0, dimension: 2, pass: 0, passes: 2 },
      {
        transformedImageData: image,
        importanceMap,
        patternsDark: [] as number[][][],
        patternsLight: [] as number[][][],
        modulePixel: 3,
        style: "dots",
        minDotSize: 0.25,
        maxDotSize: 1.0,
      }
    );

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("pass 0 skips background fill for light modules", () => {
    const ctx = mockCtx();
    const image = grayImage(4, 255);
    const importanceMap = new Array(16).fill(1);

    renderHalftoneModule(
      ctx,
      { isDark: false, nonData: false },
      0,
      0,
      10,
      { size: 40, quietZone: 0, moduleX: 0, moduleY: 0, x: 0, y: 0, dimension: 2, pass: 0, passes: 2 },
      {
        transformedImageData: image,
        importanceMap,
        patternsDark: [] as number[][][],
        patternsLight: [] as number[][][],
        modulePixel: 3,
        style: "dots",
        minDotSize: 0.25,
        maxDotSize: 1.0,
      }
    );

    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.arc).not.toHaveBeenCalled();
  });
});
