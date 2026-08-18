import { describe, it, expect, vi } from "vitest";
import type { Input } from "@/state/inputs/types";
import type { ConstraintSet } from "@/domain/constraints";
import type { QRMatrix, QRModule } from "@/domain/shared/types";
import {
  createGenerationContext,
  runGraph,
  validateNodeSequence,
  PipelineError,
  PRESETS,
  NODE_CATALOG,
} from "@/domain/pipeline";

vi.mock("@/adapters/browser/validation", async () => {
  const actual = (await vi.importActual(
    "@/adapters/browser/validation"
  )) as object;
  return {
    ...actual,
    validateDecode: vi.fn().mockResolvedValue(1.0),
    createBrowserEvaluateDecodePort: () => ({
      decodeMatrixTrials: vi.fn().mockResolvedValue([
        { success: true, payload: "HI" },
      ]),
      decodeImageData: vi.fn().mockResolvedValue([
        { success: true, payload: "HI" },
      ]),
    }),
  };
});

function tinyImage(size = 32): ImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 200;
    data[i + 1] = 200;
    data[i + 2] = 200;
    data[i + 3] = 255;
  }
  return { width: size, height: size, data } as ImageData;
}

function sampleInput(data = "HI"): Input {
  return {
    id: "t1",
    type: "string",
    mode: "byte",
    data,
  };
}

/** ConstraintSet desiring the inverse of every rendered module. */
function invertingConstraints(matrix: QRMatrix): ConstraintSet {
  const dimension = matrix.length;
  const valueGrid = new Float32Array(dimension * dimension).fill(0.5);
  const weightGrid = new Float32Array(dimension * dimension).fill(1);
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y]?.[x];
      if (m) valueGrid[y * dimension + x] = m.isDark ? 1 : 0;
    }
  }
  return { dimension, valueGrid, weightGrid };
}

function modulesById(matrix: QRMatrix): Map<string, QRModule> {
  const byId = new Map<string, QRModule>();
  for (const row of matrix) {
    for (const m of row) if (m?.id) byId.set(m.id, m);
  }
  return byId;
}

describe("constraintDamage node and damage preset", () => {
  it("registers the node with expected ports and stage", () => {
    const node = NODE_CATALOG.constraintDamage;
    expect(node).toBeTruthy();
    expect(node.stage).toBe("mutate");
    expect(node.in).toEqual(["Constraints", "Blocks", "Matrix"]);
    expect(node.out).toEqual(["Damage"]);
  });

  it("defines the damage preset feeding applyDamage", () => {
    expect(PRESETS.damage.label).toBe("Constraint damage overlay");
    expect(PRESETS.damage.nodes).toEqual([
      "parseInputs",
      "encode",
      "codewords",
      "matrix",
      "rasterize",
      "constraintDamage",
      "applyDamage",
      "evaluate",
    ]);
  });

  it("validateNodeSequence accepts the damage preset", () => {
    expect(() =>
      validateNodeSequence(
        PRESETS.damage.nodes,
        createGenerationContext({
          inputs: [sampleInput()],
          version: -1,
          errorCorrectionLevel: 0,
          dataMask: -1,
          targetImage: tinyImage(),
        })
      )
    ).not.toThrow();
  });

  it("validateNodeSequence rejects constraintDamage before matrix", () => {
    expect(() =>
      validateNodeSequence(["constraintDamage"], createGenerationContext())
    ).toThrow(PipelineError);

    expect(() =>
      validateNodeSequence(
        ["parseInputs", "encode", "codewords", "constraintDamage"],
        createGenerationContext({
          inputs: [sampleInput()],
          version: -1,
          errorCorrectionLevel: 0,
          targetImage: tinyImage(),
        })
      )
    ).toThrow(/missing required ports/);
  });

  it("runs the damage preset end-to-end with a small image", async () => {
    const ctx = await runGraph(
      "damage",
      createGenerationContext({
        inputs: [sampleInput()],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: 0,
        targetImage: tinyImage(64),
      })
    );
    expect(ctx.matrix).toBeTruthy();
    expect(Array.isArray(ctx.damagedModuleIds)).toBe(true);
    expect(ctx.evaluation).toBeTruthy();
    expect(ctx.evaluation?.metrics.length).toBeGreaterThan(0);
  });

  it("applies selected damage to the matrix and attaches evaluation", async () => {
    // Run the preset front half to get matrix + blocks + constraints,
    // then override constraints so damage is guaranteed.
    const core = await runGraph(
      ["parseInputs", "encode", "codewords", "matrix", "rasterize"],
      createGenerationContext({
        inputs: [sampleInput()],
        version: -1,
        errorCorrectionLevel: 0,
        dataMask: 0,
        targetImage: tinyImage(64),
      })
    );
    expect(core.matrix).toBeTruthy();
    const before = modulesById(core.matrix!);

    const out = await runGraph(
      ["constraintDamage", "applyDamage", "evaluate"],
      { ...core, constraints: invertingConstraints(core.matrix!) }
    );

    const damaged = out.damagedModuleIds ?? [];
    expect(damaged.length).toBeGreaterThan(0);

    const after = modulesById(out.matrix!);
    const damagedSet = new Set(damaged);
    for (const [id, was] of before) {
      const now = after.get(id);
      expect(now).toBeTruthy();
      if (damagedSet.has(id)) {
        expect(now!.isDark).toBe(!was.isDark);
      } else {
        expect(now!.isDark).toBe(was.isDark);
      }
    }

    expect(out.evaluation).toBeTruthy();
  });
});
