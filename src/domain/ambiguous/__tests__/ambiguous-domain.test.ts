import { describe, it, expect, vi } from "vitest";
import { createInput } from "@/state/inputs/inputFactory";
import { encodePair } from "@/domain/dual";
import {
  generateAmbiguous,
  countAgreement,
  checkerQuadrants,
  renderAmbiguousModule,
} from "@/domain/ambiguous";

function stringInput(text: string, label = "s") {
  return createInput({ type: "string", label, text, data: text, mode: "byte" });
}

describe("encodePair", () => {
  it("produces same-sized matrices with a shared mask", () => {
    const result = encodePair({
      inputsA: [stringInput("hello")],
      inputsB: [stringInput("world")],
      version: -1,
      errorCorrectionLevel: 0,
      dataMask: -1,
    });
    expect(result.errorA).toBeNull();
    expect(result.errorB).toBeNull();
    expect(result.matrixA).toBeTruthy();
    expect(result.matrixB).toBeTruthy();
    expect(result.matrixA!.length).toBe(result.matrixB!.length);
    expect(result.dataMask).toBeGreaterThanOrEqual(0);
    expect(result.dataMask).toBeLessThanOrEqual(7);
  });

  it("uses max version when Auto", () => {
    const short = encodePair({
      inputsA: [stringInput("a")],
      inputsB: [stringInput("b")],
      version: -1,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    const longB = "x".repeat(80);
    const mixed = encodePair({
      inputsA: [stringInput("a")],
      inputsB: [stringInput(longB)],
      version: -1,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    expect(mixed.version).toBeGreaterThanOrEqual(short.version);
    expect(mixed.matrixA!.length).toBe(mixed.matrixB!.length);
  });

  it("forces explicit mask onto both", () => {
    const result = encodePair({
      inputsA: [stringInput("alpha")],
      inputsB: [stringInput("beta")],
      version: 2,
      errorCorrectionLevel: 0,
      dataMask: 3,
    });
    expect(result.dataMask).toBe(3);
  });
});

describe("ambiguous checker", () => {
  it("checkerQuadrants defaults A on main diagonal", () => {
    expect(checkerQuadrants(false)).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(checkerQuadrants(true)).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it("countAgreement tallies matching modules", () => {
    const result = generateAmbiguous({
      inputsA: [stringInput("same")],
      inputsB: [stringInput("same")],
      version: 1,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    expect(result.stats.totalModules).toBeGreaterThan(0);
    // Identical payloads → all modules agree
    expect(result.stats.disagreeCount).toBe(0);
    expect(result.stats.agreeCount).toBe(result.stats.totalModules);
  });

  it("different payloads produce some disagreements", () => {
    const result = generateAmbiguous({
      inputsA: [stringInput("aaaa")],
      inputsB: [stringInput("bbbb")],
      version: 2,
      errorCorrectionLevel: 0,
      dataMask: 0,
    });
    expect(result.stats.disagreeCount).toBeGreaterThan(0);
    const recounted = countAgreement(result.matrixA!, result.matrixB!);
    expect(recounted).toEqual(result.stats);
  });

  it("renderAmbiguousModule draws solid when bits agree", () => {
    const fillRect = vi.fn();
    const ctx = { imageSmoothingEnabled: true, fillStyle: "", fillRect } as unknown as CanvasRenderingContext2D;
    renderAmbiguousModule(ctx, true, true, 0, 0, 10, 10, false);
    expect(fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillStyle).toBe("#000");
    expect(fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
  });

  it("renderAmbiguousModule checkerboards when bits differ", () => {
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
    // A dark, B light → TL/BR = A (#000), TR/BL = B (#fff)
    renderAmbiguousModule(ctx, true, false, 0, 0, 10, 10, false);
    expect(fillRect).toHaveBeenCalledTimes(4);
    expect(fillStyles).toEqual(["#000", "#fff", "#fff", "#000"]);
  });
});
