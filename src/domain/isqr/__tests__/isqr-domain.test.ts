import { describe, it, expect } from "vitest";
import {
  otsuThreshold,
  computeFtSaliency,
  computeInstanceMask,
  labelConnectedComponents,
  maskToModuleGrid,
} from "../segmentation";
import { haarForward2D, haarInverse2D } from "../dwt";
import { mannosSakrisonCsf, applyDwtCsf } from "../csf";
import {
  computeMse,
  computePsnr,
  computeSsim,
  computeFsim,
  computeGmsd,
  computeImageQualityMetrics,
} from "../metrics";
import { computeModuleBinaryTarget } from "../moduleBinary";

function solidImage(w: number, h: number, r: number, g: number, b: number): ImageData {
  const img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
    img.data[o + 3] = 255;
  }
  return img;
}

function checkerImage(size: number): ImageData {
  const img = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = (x + y) % 2 === 0 ? 0 : 255;
      const o = (y * size + x) * 4;
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  return img;
}

describe("IS-QR segmentation", () => {
  it("otsuThreshold separates bimodal values", () => {
    const values = new Float32Array(200);
    for (let i = 0; i < 100; i++) values[i] = 0.1;
    for (let i = 100; i < 200; i++) values[i] = 0.9;
    const t = otsuThreshold(values);
    expect(t).toBeGreaterThan(0.2);
    expect(t).toBeLessThan(0.8);
  });

  it("computeFtSaliency is normalized and non-negative", () => {
    const img = checkerImage(32);
    const sal = computeFtSaliency(img);
    expect(sal.length).toBe(32 * 32);
    let max = 0;
    for (let i = 0; i < sal.length; i++) {
      expect(sal[i]).toBeGreaterThanOrEqual(0);
      if (sal[i] > max) max = sal[i];
    }
    expect(max).toBeLessThanOrEqual(1 + 1e-6);
  });

  it("labelConnectedComponents finds blobs", () => {
    const w = 8;
    const h = 8;
    const binary = new Uint8Array(w * h);
    // two 2x2 blobs
    binary[1 * w + 1] = 1;
    binary[1 * w + 2] = 1;
    binary[2 * w + 1] = 1;
    binary[2 * w + 2] = 1;
    binary[5 * w + 5] = 1;
    binary[5 * w + 6] = 1;
    binary[6 * w + 5] = 1;
    binary[6 * w + 6] = 1;
    const { count } = labelConnectedComponents(binary, w, h);
    expect(count).toBe(2);
  });

  it("computeInstanceMask returns mask for high-contrast image", () => {
    // Bright circle on dark background
    const size = 48;
    const img = solidImage(size, size, 0, 0, 0);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - 24;
        const dy = y - 24;
        if (dx * dx + dy * dy < 10 * 10) {
          const o = (y * size + x) * 4;
          img.data[o] = 255;
          img.data[o + 1] = 200;
          img.data[o + 2] = 180;
        }
      }
    }
    const result = computeInstanceMask(img);
    expect(result.mask.length).toBe(size * size);
    let roiPixels = 0;
    for (let i = 0; i < result.mask.length; i++) {
      if (result.mask[i] > 0.5) roiPixels++;
    }
    expect(roiPixels).toBeGreaterThan(0);
  });

  it("maskToModuleGrid averages into QR modules", () => {
    const mask = new Float32Array(16);
    for (let i = 0; i < 8; i++) mask[i] = 1;
    const grid = maskToModuleGrid(mask, 4, 4, 2);
    expect(grid.length).toBe(4);
    expect(grid[0]).toBeGreaterThan(0.5);
  });
});

describe("IS-QR DWT", () => {
  it("Haar forward/inverse round-trips even buffers", () => {
    const w = 8;
    const h = 8;
    const src = new Float32Array(w * h);
    for (let i = 0; i < src.length; i++) src[i] = (i * 17) % 255;
    const bands = haarForward2D(src, w, h);
    const out = haarInverse2D(bands, w, h);
    for (let i = 0; i < src.length; i++) {
      expect(out[i]).toBeCloseTo(src[i], 5);
    }
  });
});

describe("IS-QR CSF", () => {
  it("mannosSakrisonCsf peaks then decays", () => {
    const low = mannosSakrisonCsf(0.5);
    const mid = mannosSakrisonCsf(4);
    const high = mannosSakrisonCsf(40);
    expect(mid).toBeGreaterThan(low);
    expect(mid).toBeGreaterThan(high);
  });

  it("applyDwtCsf strength 0 returns same pixels", () => {
    const img = solidImage(16, 16, 120, 80, 40);
    const out = applyDwtCsf(img, { strength: 0 });
    expect(out.data[0]).toBe(120);
  });
});

describe("IS-QR metrics", () => {
  it("identical images score perfectly", () => {
    const img = solidImage(32, 32, 100, 110, 120);
    const m = computeImageQualityMetrics(img, img);
    expect(m.mse).toBe(0);
    expect(m.psnr).toBe(Infinity);
    expect(m.ssim).toBeCloseTo(1, 5);
    expect(m.fsim).toBeCloseTo(1, 2);
    expect(m.gmsd).toBeCloseTo(0, 5);
  });

  it("different images have positive MSE and finite PSNR", () => {
    const a = solidImage(32, 32, 0, 0, 0);
    const b = solidImage(32, 32, 255, 255, 255);
    expect(computeMse(a, b)).toBeGreaterThan(0);
    expect(computePsnr(a, b)).toBeLessThan(Infinity);
    expect(computeSsim(a, b)).toBeLessThan(1);
    expect(computeFsim(a, b)).toBeLessThanOrEqual(1);
    expect(computeGmsd(a, b)).toBeGreaterThanOrEqual(0);
  });
});

describe("IS-QR module binary", () => {
  it("produces binary 0/1 module grid", () => {
    const img = checkerImage(64);
    const grid = computeModuleBinaryTarget(img, 8);
    expect(grid.length).toBe(64);
    for (let i = 0; i < grid.length; i++) {
      expect(grid[i] === 0 || grid[i] === 1).toBe(true);
    }
  });
});
