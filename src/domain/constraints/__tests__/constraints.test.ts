import { describe, it, expect } from "vitest";
import {
  constraintsFromImageGrids,
  constraintsFromMatrix,
  constraintsToGrids,
  mergeConstraintItems,
} from "@/domain/constraints";
import type {
  ConstraintSet,
  ModuleConstraint,
} from "@/domain/constraints";
import type { QRMatrix, QRModule } from "@/domain/shared/types";
import {
  NODE_CATALOG,
  contextHasPort,
  validateNodeSequence,
  PRESETS,
  createGenerationContext,
} from "@/domain/pipeline";

function grid(dimension: number, fill: (i: number) => number): Float32Array {
  const g = new Float32Array(dimension * dimension);
  for (let i = 0; i < g.length; i++) g[i] = fill(i);
  return g;
}

/** Raw-weight oracle: exact clamping from buildBitOrder's roi branch. */
function rawWeight(contrast: number, roi: number | undefined): number {
  const validContrast =
    typeof contrast === "number" && isFinite(contrast) && contrast >= 0
      ? contrast
      : 0;
  const r =
    roi !== undefined ? Math.max(0, Math.min(1, roi)) : 0;
  // Stored in a Float32Array, so the raw product is float32-rounded.
  return Math.fround(validContrast * (1 - r));
}

describe("constraintsFromImageGrids", () => {
  it("round-trips grids -> ConstraintSet -> grids", () => {
    const dim = 5;
    const target = grid(dim, (i) => (i % 7) / 7);
    const contrast = grid(dim, (i) => i * 13.25);

    const set = constraintsFromImageGrids(target, contrast, undefined, dim);
    const out = constraintsToGrids(set);

    expect(out.dimension).toBe(dim);
    expect(Array.from(out.valueGrid)).toEqual(Array.from(target));
    // Without ROI, raw weights equal the (valid) contrast values exactly.
    expect(Array.from(out.weightGrid)).toEqual(Array.from(contrast));
    // Fresh arrays, not aliases of the inputs.
    expect(out.valueGrid).not.toBe(target);
    expect(set.valueGrid).not.toBe(target);
  });

  it("attenuates weights by (1 - roi) with clamping, matching buildBitOrder", () => {
    const dim = 3;
    const target = grid(dim, () => 0.5);
    const contrastValues = [0, 137, 16000, 25, 74.9, 3, 1200, 55.5, 999];
    const roiValues = [0, 0.25, 1, -0.5, 1.5, 0.999, 0.5, 0.1, 0.75];
    const contrast = grid(dim, (i) => contrastValues[i]);
    const roi = grid(dim, (i) => roiValues[i]);

    const set = constraintsFromImageGrids(target, contrast, roi, dim);

    for (let i = 0; i < dim * dim; i++) {
      // Compare against float32-exact inputs, as the implementation reads them.
      expect(set.weightGrid[i]).toBe(rawWeight(contrast[i], roi[i]));
    }
    // roi clamped low keeps full contrast; clamped high zeroes the weight.
    expect(set.weightGrid[3]).toBe(25);
    expect(set.weightGrid[4]).toBe(0);
  });

  it("zeroes invalid contrast (NaN, Infinity, negative)", () => {
    const dim = 2;
    const target = grid(dim, () => 0);
    const contrast = new Float32Array([NaN, Infinity, -10, 42]);

    const set = constraintsFromImageGrids(target, contrast, undefined, dim);

    expect(Array.from(set.weightGrid)).toEqual([0, 0, 0, 42]);
  });

  it("stores RAW weights — no quantization applied", () => {
    const dim = 1;
    const set = constraintsFromImageGrids(
      new Float32Array([0.5]),
      new Float32Array([137]),
      undefined,
      dim
    );
    // buildBitOrder would quantize 137 to 150; the constraint set must not.
    expect(set.weightGrid[0]).toBe(137);
    expect(set.weightGrid[0] % 50).not.toBe(0);
  });

  it("rejects dimension mismatches", () => {
    const ok = new Float32Array(4);
    expect(() =>
      constraintsFromImageGrids(new Float32Array(3), ok, undefined, 2)
    ).toThrow(RangeError);
    expect(() =>
      constraintsFromImageGrids(ok, new Float32Array(5), undefined, 2)
    ).toThrow(RangeError);
    expect(() =>
      constraintsFromImageGrids(ok, ok, new Float32Array(9), 2)
    ).toThrow(RangeError);
    expect(() =>
      constraintsFromImageGrids(ok, ok, undefined, 0)
    ).toThrow(RangeError);
    expect(() =>
      constraintsFromImageGrids(ok, ok, undefined, 2.5)
    ).toThrow(RangeError);
  });
});

describe("merge precedence (sparse items over dense grids)", () => {
  function baseSet(items?: ModuleConstraint[]): ConstraintSet {
    return {
      dimension: 2,
      items,
      valueGrid: new Float32Array([0.5, 0.5, 0.5, 0.5]),
      weightGrid: new Float32Array([10, 10, 10, 10]),
    };
  }

  it("items override dense cells; untouched cells keep dense values", () => {
    const out = constraintsToGrids(
      baseSet([
        {
          x: 1,
          y: 0,
          strength: "optional",
          desiredValue: true,
          weight: 99,
          source: "user",
        },
      ])
    );
    expect(Array.from(out.valueGrid)).toEqual([0.5, 0, 0.5, 0.5]);
    expect(Array.from(out.weightGrid)).toEqual([10, 99, 10, 10]);
  });

  it("higher strength wins over higher weight", () => {
    const out = constraintsToGrids(
      baseSet([
        {
          x: 0,
          y: 0,
          strength: "preferred",
          desiredValue: false,
          weight: 1000,
          source: "user",
        },
        {
          x: 0,
          y: 0,
          strength: "required",
          desiredValue: true,
          weight: 1,
          source: "user",
        },
      ])
    );
    expect(out.valueGrid[0]).toBe(0); // required item's dark value
    expect(out.weightGrid[0]).toBe(1);
  });

  it("equal strength: higher weight wins; full tie: later item wins", () => {
    const out = constraintsToGrids(
      baseSet([
        {
          x: 0,
          y: 0,
          strength: "preferred",
          desiredValue: true,
          weight: 5,
          source: "user",
        },
        {
          x: 0,
          y: 0,
          strength: "preferred",
          desiredValue: false,
          weight: 3,
          source: "user",
        },
      ])
    );
    expect(out.valueGrid[0]).toBe(0); // weight 5 item wins

    const tie = constraintsToGrids(
      baseSet([
        {
          x: 1,
          y: 1,
          strength: "preferred",
          desiredValue: true,
          weight: 5,
          source: "user",
        },
        {
          x: 1,
          y: 1,
          strength: "preferred",
          desiredValue: false,
          weight: 5,
          source: "user",
        },
      ])
    );
    expect(tie.valueGrid[3]).toBe(1); // later item wins the full tie
  });

  it("item without desiredValue overrides weight but keeps dense value", () => {
    const out = constraintsToGrids(
      baseSet([
        { x: 0, y: 1, strength: "required", weight: 77, source: "user" },
      ])
    );
    expect(out.valueGrid[2]).toBe(0.5);
    expect(out.weightGrid[2]).toBe(77);
  });

  it("rejects out-of-bounds items and mismatched grids; does not mutate input", () => {
    expect(() =>
      mergeConstraintItems(
        baseSet([
          { x: 2, y: 0, strength: "optional", weight: 1, source: "user" },
        ])
      )
    ).toThrow(RangeError);

    expect(() =>
      constraintsToGrids({
        dimension: 2,
        valueGrid: new Float32Array(4),
        weightGrid: new Float32Array(3),
      })
    ).toThrow(RangeError);

    const set = baseSet([
      {
        x: 0,
        y: 0,
        strength: "required",
        desiredValue: true,
        weight: 1,
        source: "user",
      },
    ]);
    const merged = mergeConstraintItems(set);
    expect(merged.items).toBeUndefined();
    expect(set.valueGrid[0]).toBe(0.5); // input untouched
    expect(set.items).toHaveLength(1);
  });
});

describe("constraintsFromMatrix", () => {
  function makeModule(
    x: number,
    y: number,
    isDark: boolean,
    bitId = ""
  ): QRModule {
    return {
      id: `${x}-${y}`,
      bitId,
      bit: { value: isDark ? 1 : 0, id: bitId, sourceId: "s" },
      x,
      y,
      isDark,
      isMasked: false,
      type: "data",
    };
  }

  function makeMatrix(darkness: boolean[][]): QRMatrix {
    return darkness.map((row, y) =>
      row.map((dark, x) => makeModule(x, y, dark, `bit-${x}-${y}`))
    ) as QRMatrix;
  }

  it("maps isDark to valueGrid (dark => 0, light => 1) with source 'matrix'", () => {
    const matrix = makeMatrix([
      [true, false],
      [false, true],
    ]);
    const set = constraintsFromMatrix(matrix);

    expect(set.dimension).toBe(2);
    expect(Array.from(set.valueGrid)).toEqual([0, 1, 1, 0]);
    expect(Array.from(set.weightGrid)).toEqual([1, 1, 1, 1]);
    expect(set.items).toHaveLength(4);
    for (const item of set.items!) {
      expect(item.source).toBe("matrix");
      expect(item.strength).toBe("preferred");
      expect(item.desiredValue).toBe(
        matrix[item.y][item.x].isDark
      );
      expect(item.bitId).toBe(`bit-${item.x}-${item.y}`);
    }
    // Dense and sparse agree: applying items is a no-op.
    const out = constraintsToGrids(set);
    expect(Array.from(out.valueGrid)).toEqual(Array.from(set.valueGrid));
    expect(Array.from(out.weightGrid)).toEqual(Array.from(set.weightGrid));
  });

  it("honors weight/strength options and handles missing modules", () => {
    const matrix = makeMatrix([
      [true, false],
      [false, true],
    ]);
    (matrix[1] as (QRModule | undefined)[])[0] = undefined;

    const set = constraintsFromMatrix(matrix, {
      weight: 250,
      strength: "required",
    });

    expect(set.valueGrid[2]).toBe(0.5); // missing module -> neutral
    expect(set.weightGrid[2]).toBe(0);
    expect(set.items).toHaveLength(3);
    expect(set.items!.every((i) => i.weight === 250)).toBe(true);
    expect(set.items!.every((i) => i.strength === "required")).toBe(true);
  });
});

describe("pipeline integration", () => {
  function tinyImage(size: number, fill?: (i: number) => number): ImageData {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let p = 0; p < size * size; p++) {
      const v = fill ? fill(p) : 200;
      data[p * 4] = v;
      data[p * 4 + 1] = v;
      data[p * 4 + 2] = v;
      data[p * 4 + 3] = 255;
    }
    return { width: size, height: size, data } as ImageData;
  }

  it("declares and satisfies the Constraints port", () => {
    expect(NODE_CATALOG.rasterize.out).toContain("Constraints");
    expect(NODE_CATALOG.isqrRoi.out).toContain("Constraints");
    expect(contextHasPort({}, "Constraints")).toBe(false);
    expect(
      contextHasPort(
        {
          constraints: {
            dimension: 1,
            valueGrid: new Float32Array(1),
            weightGrid: new Float32Array(1),
          },
        },
        "Constraints"
      )
    ).toBe(true);
    // Preset sequences still validate with the extra out port.
    expect(() =>
      validateNodeSequence(
        [...PRESETS.isqr.nodes],
        createGenerationContext({
          inputs: [],
          version: 1,
          errorCorrectionLevel: 0,
          targetImage: tinyImage(8),
        })
      )
    ).not.toThrow();
  });

  it("rasterize emits constraints mirroring its grids", async () => {
    const ctx = await NODE_CATALOG.rasterize.run({
      version: 1,
      targetImage: tinyImage(64, (i) => (i * 7) % 256),
    });

    expect(ctx.constraints).toBeDefined();
    const set = ctx.constraints!;
    expect(set.dimension).toBe(21);
    expect(Array.from(set.valueGrid)).toEqual(Array.from(ctx.targetGrid!));
    // No roiGrid in context: raw weights == valid contrast values.
    for (let i = 0; i < set.weightGrid.length; i++) {
      expect(set.weightGrid[i]).toBe(
        rawWeight(ctx.contrastGrid![i], undefined)
      );
    }
  });

  it("isqrRoi emits ROI-attenuated constraints", async () => {
    const ctx = await NODE_CATALOG.isqrRoi.run({
      version: 1,
      errorCorrectionLevel: 0,
      targetImage: tinyImage(64, (i) => (i % 64 < 32 ? 30 : 230)),
    });

    expect(ctx.constraints).toBeDefined();
    const set = ctx.constraints!;
    expect(set.dimension).toBe(21);
    expect(Array.from(set.valueGrid)).toEqual(Array.from(ctx.targetGrid!));
    // No contrastGrid in context: binary target is the contrast stand-in.
    for (let i = 0; i < set.weightGrid.length; i++) {
      expect(set.weightGrid[i]).toBe(
        rawWeight(ctx.targetGrid![i], ctx.roiGrid![i])
      );
    }
  });
});
