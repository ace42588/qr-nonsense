import { describe, it, expect, vi } from "vitest";
import {
  buildEmbedPattern,
  generateEmbed,
  renderEmbedModule,
  fuseEmbedPair,
  fuseEmbedPairWithCsf,
} from "@/domain/embed";
import { createInput } from "@/state/inputs/inputFactory";
import { encodePair } from "@/domain/dual";

function stringInput(text: string) {
  return createInput({ type: "string", label: "s", text, data: text, mode: "byte" });
}

describe("buildEmbedPattern", () => {
  it("outer eight from A, center from B", () => {
    expect(buildEmbedPattern(true, false)).toEqual([
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ]);
    expect(buildEmbedPattern(false, true)).toEqual([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ]);
  });
});

describe("fuseEmbedPair", () => {
  it("identical modules stay solid A", () => {
    const pair = encodePair({
      inputsA: [stringInput("same")],
      inputsB: [stringInput("same")],
      version: 1,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    const fused = fuseEmbedPair(pair.matrixA!, pair.matrixB!, {
      modulePixel: 9,
      centerSeed: 0.4,
      polarityStrength: 1,
    });
    // Sample module (0,0) finder — should be uniform dark or light
    const mp = 9;
    const samples = new Set<number>();
    for (let py = 0; py < mp; py++) {
      for (let px = 0; px < mp; px++) {
        samples.add(fused.data[(py * fused.width + px) * 4]);
      }
    }
    expect(samples.size).toBe(1);
  });

  it("larger centerSeed covers more of the module with B influence", () => {
    const pair = encodePair({
      inputsA: [stringInput("aaaa")],
      inputsB: [stringInput("bbbb")],
      version: 2,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    // Find a module where A and B differ
    let mx = -1;
    let my = -1;
    const dim = pair.matrixA!.length;
    for (let y = 0; y < dim && mx < 0; y++) {
      for (let x = 0; x < dim && mx < 0; x++) {
        const a = pair.matrixA![y][x];
        const b = pair.matrixB![y][x];
        if (a && b && !a.nonData && !!a.isDark !== !!b.isDark) {
          mx = x;
          my = y;
        }
      }
    }
    expect(mx).toBeGreaterThanOrEqual(0);

    const mp = 9;
    const small = fuseEmbedPair(pair.matrixA!, pair.matrixB!, {
      modulePixel: mp,
      centerSeed: 0.2,
      polarityStrength: 1,
    });
    const large = fuseEmbedPair(pair.matrixA!, pair.matrixB!, {
      modulePixel: mp,
      centerSeed: 0.9,
      polarityStrength: 1,
    });

    const aDark = !!pair.matrixA![my][mx].isDark;
    const bPol = pair.matrixB![my][mx].isDark ? 0 : 255;
    const aPol = aDark ? 0 : 255;

    const centerIdx = ((my * mp + Math.floor(mp / 2)) * small.width + (mx * mp + Math.floor(mp / 2))) * 4;
    // Center should lean toward B for both
    expect(Math.abs(small.data[centerIdx] - bPol)).toBeLessThan(
      Math.abs(small.data[centerIdx] - aPol) + 1
    );

    // Corner of module: small seed stays near A; large seed pulls toward B
    const cornerIdx = ((my * mp) * large.width + mx * mp) * 4;
    const smallCorner = small.data[cornerIdx];
    const largeCorner = large.data[cornerIdx];
    expect(Math.abs(smallCorner - aPol)).toBeLessThanOrEqual(
      Math.abs(largeCorner - aPol) + 5
    );
  });

  it("CSF path returns same dimensions", () => {
    const pair = encodePair({
      inputsA: [stringInput("host")],
      inputsB: [stringInput("guest")],
      version: -1,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    const fused = fuseEmbedPairWithCsf(pair.matrixA!, pair.matrixB!, {
      modulePixel: 9,
      csf: { strength: 0.5 },
    });
    expect(fused.width).toBe(pair.matrixA!.length * 9);
    expect(fused.height).toBe(fused.width);
  });
});

describe("generateEmbed", () => {
  it("returns fusedImage for a dual pair", () => {
    const result = generateEmbed({
      inputsA: [stringInput("host")],
      inputsB: [stringInput("guest")],
      version: -1,
      errorCorrectionLevel: 0,
      dataMask: -1,
      centerSeed: 0.35,
      csf: { strength: 0.4 },
    });
    expect(result.matrixA).toBeTruthy();
    expect(result.matrixB).toBeTruthy();
    expect(result.fusedImage).toBeTruthy();
    expect(result.fusedImage!.width).toBe(result.matrixA!.length * result.modulePixel);
  });
});

describe("renderEmbedModule (legacy hard 3x3)", () => {
  it("paints nine submodules with outer A and center B", () => {
    const fillStyles: string[] = [];
    const fillRect = vi.fn();
    const ctx = {
      imageSmoothingEnabled: true,
      get fillStyle() {
        return fillStyles[fillStyles.length - 1] ?? "";
      },
      set fillStyle(v: string) {
        fillStyles.push(v);
      },
      fillRect,
    } as unknown as CanvasRenderingContext2D;
    renderEmbedModule(ctx, true, false, 0, 0, 9);
    expect(fillRect).toHaveBeenCalledTimes(9);
    expect(fillStyles).toEqual([
      "#111", "#111", "#111",
      "#111", "#fff", "#111",
      "#111", "#111", "#111",
    ]);
  });
});
