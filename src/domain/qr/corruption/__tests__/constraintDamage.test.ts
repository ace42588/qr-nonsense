import { describe, it, expect } from "vitest";
import { getEncodedMessage } from "@/domain/qr";
import { buildCodewords, buildMatrix } from "@/domain/qr/stages";
import { buildBitIdIndex } from "@/domain/qr/reedsolomon/applyFlips";
import { damagedIdsToDataBitIds } from "@/domain/qr/corruption/applyDamage";
import {
  selectConstraintDamage,
  DEFAULT_SAFETY_MARGIN,
} from "@/domain/qr/corruption/constraintDamage";
import { computeRsRemainingBudget } from "@/domain/evaluate/rsBudget";
import type { ConstraintSet } from "@/domain/constraints";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { QRMatrix, QRModule } from "@/domain/shared/types";
import type { Input } from "@/state/inputs/types";

interface Fixture {
  matrix: QRMatrix;
  blocks: QRBlock[];
  dimension: number;
}

function buildQr(data: string, version = -1, ecl = 0): Fixture {
  const input: Input = { id: "t1", type: "string", mode: "byte", data };
  const encoded = getEncodedMessage([input], version, ecl);
  const built = buildCodewords(encoded.segments, encoded.version, ecl);
  const { matrix } = buildMatrix(built.codewords, 0, encoded.version, ecl);
  return { matrix, blocks: built.blocks, dimension: matrix.length };
}

/** Constraints matching the rendered matrix exactly (nothing to change). */
function agreeingConstraints(matrix: QRMatrix, weight = 1): ConstraintSet {
  const dimension = matrix.length;
  const valueGrid = new Float32Array(dimension * dimension).fill(0.5);
  const weightGrid = new Float32Array(dimension * dimension).fill(weight);
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y]?.[x];
      if (m) valueGrid[y * dimension + x] = m.isDark ? 0 : 1;
    }
  }
  return { dimension, valueGrid, weightGrid };
}

/** Constraints desiring the inverse of every rendered module. */
function invertingConstraints(matrix: QRMatrix, weight = 1): ConstraintSet {
  const set = agreeingConstraints(matrix, weight);
  for (let i = 0; i < set.valueGrid.length; i++) {
    set.valueGrid[i] = 1 - set.valueGrid[i];
  }
  return set;
}

/** Mark `module` as "desired inverted" with the given weight. */
function requestFlip(
  set: ConstraintSet,
  module: QRModule,
  weight: number
): void {
  const idx = module.y * set.dimension + module.x;
  set.valueGrid[idx] = module.isDark ? 1 : 0;
  set.weightGrid[idx] = weight;
}

/** Group data-region matrix modules by their (block, codeword). */
function modulesByCodeword(fx: Fixture): Map<string, QRModule[]> {
  const bitIndex = buildBitIdIndex(fx.blocks);
  const groups = new Map<string, QRModule[]>();
  for (let y = 0; y < fx.dimension; y++) {
    for (let x = 0; x < fx.dimension; x++) {
      const m = fx.matrix[y]?.[x];
      if (!m?.id || m.nonData) continue;
      const loc = bitIndex.get(m.bit?.id || m.bitId);
      if (!loc) continue;
      const key = `${loc.blockIndex}:${loc.byteIndex}`;
      const list = groups.get(key) ?? [];
      list.push(m);
      groups.set(key, list);
    }
  }
  return groups;
}

function blockT(block: QRBlock): number {
  return Math.floor(block.errorCorrection.length / 2);
}

/** Count distinct damaged codewords per block for a selection. */
function damagedCodewordsPerBlock(
  fx: Fixture,
  selected: string[]
): Map<number, Set<number>> {
  const bitIndex = buildBitIdIndex(fx.blocks);
  const byId = new Map<string, QRModule>();
  for (const row of fx.matrix) {
    for (const m of row) if (m?.id) byId.set(m.id, m);
  }
  const perBlock = new Map<number, Set<number>>();
  for (const id of selected) {
    const m = byId.get(id);
    expect(m).toBeTruthy();
    const loc = bitIndex.get(m!.bit?.id || m!.bitId);
    expect(loc).toBeTruthy();
    const set = perBlock.get(loc!.blockIndex) ?? new Set<number>();
    set.add(loc!.byteIndex);
    perBlock.set(loc!.blockIndex, set);
  }
  return perBlock;
}

describe("selectConstraintDamage", () => {
  it("returns no damage when constraints agree with the matrix", () => {
    const fx = buildQr("HELLO");
    const set = agreeingConstraints(fx.matrix, 1);
    expect(selectConstraintDamage(set, fx.blocks, fx.matrix)).toEqual([]);
  });

  it("returns no damage for neutral zero-weight constraints", () => {
    const fx = buildQr("HELLO");
    const set: ConstraintSet = {
      dimension: fx.dimension,
      valueGrid: new Float32Array(fx.dimension * fx.dimension).fill(0.5),
      weightGrid: new Float32Array(fx.dimension * fx.dimension),
    };
    expect(selectConstraintDamage(set, fx.blocks, fx.matrix)).toEqual([]);
  });

  it("ranks by weight desc with y-then-x tie-break and caps codewords", () => {
    const fx = buildQr("A");
    const t = blockT(fx.blocks[0]);
    expect(t).toBeGreaterThanOrEqual(3); // v1-L: 7 EC codewords, t = 3

    // Three modules from three distinct codewords of the single block.
    const groups = [...modulesByCodeword(fx).values()];
    expect(groups.length).toBeGreaterThanOrEqual(3);
    const [a] = groups[0];
    const [b] = groups[1];
    const [c] = groups[2];

    const set = agreeingConstraints(fx.matrix, 0);
    requestFlip(set, a, 5);
    requestFlip(set, b, 3);
    requestFlip(set, c, 3);

    // Default margin 1 leaves t - 1 = 2 usable codewords.
    const selected = selectConstraintDamage(set, fx.blocks, fx.matrix);
    expect(selected.length).toBe(2);
    expect(selected[0]).toBe(a.id);

    // Tie between b and c broken by y then x.
    const winner =
      b.y !== c.y ? (b.y < c.y ? b : c) : b.x < c.x ? b : c;
    expect(selected[1]).toBe(winner.id);

    // Deterministic: identical output on a second run.
    expect(selectConstraintDamage(set, fx.blocks, fx.matrix)).toEqual(
      selected
    );
  });

  it("counts a whole codeword as one budget unit", () => {
    const fx = buildQr("A");
    const t = blockT(fx.blocks[0]);
    const groups = [...modulesByCodeword(fx).values()];
    const codewordModules = groups.find((g) => g.length === 8)!;
    expect(codewordModules).toBeTruthy();
    const other = groups.find((g) => g !== codewordModules)![0];

    const set = agreeingConstraints(fx.matrix, 0);
    for (const m of codewordModules) requestFlip(set, m, 1);
    requestFlip(set, other, 0.5);

    // Allow exactly one damaged codeword.
    const selected = selectConstraintDamage(set, fx.blocks, fx.matrix, {
      safetyMargin: t - 1,
    });

    // All 8 modules of the higher-weight codeword fit in one unit;
    // the lower-weight module in another codeword is over budget.
    expect(selected.sort()).toEqual(
      codewordModules.map((m) => m.id).sort()
    );
    expect(selected).not.toContain(other.id);
  });

  it("never exceeds per-block budget and RS still decodes (multi-block)", () => {
    const fx = buildQr("BUDGET", 6, 0); // v6-L: 2 RS blocks
    expect(fx.blocks.length).toBeGreaterThan(1);

    const set = invertingConstraints(fx.matrix, 1);
    const selected = selectConstraintDamage(set, fx.blocks, fx.matrix);
    expect(selected.length).toBeGreaterThan(0);

    const perBlock = damagedCodewordsPerBlock(fx, selected);
    fx.blocks.forEach((block, blockIndex) => {
      const damaged = perBlock.get(blockIndex)?.size ?? 0;
      expect(damaged).toBeLessThanOrEqual(
        blockT(block) - DEFAULT_SAFETY_MARGIN
      );
    });

    // Budget math consistency: every block still decodes with at least
    // the safety margin of correction capacity to spare.
    const flippedBitIds = damagedIdsToDataBitIds(fx.matrix, selected);
    expect(flippedBitIds.length).toBe(selected.length);
    const budget = computeRsRemainingBudget(fx.blocks, flippedBitIds);
    expect(budget.allOk).toBe(true);
    expect(budget.worstBlockRemaining).toBeGreaterThanOrEqual(
      DEFAULT_SAFETY_MARGIN
    );

    // Deterministic across runs.
    expect(selectConstraintDamage(set, fx.blocks, fx.matrix)).toEqual(
      selected
    );
  });

  it("respects minWeight threshold", () => {
    const fx = buildQr("A");
    const groups = [...modulesByCodeword(fx).values()];
    const [strong] = groups[0];
    const [weak] = groups[1];

    const set = agreeingConstraints(fx.matrix, 0);
    requestFlip(set, strong, 0.9);
    requestFlip(set, weak, 0.2);

    const selected = selectConstraintDamage(set, fx.blocks, fx.matrix, {
      minWeight: 0.5,
    });
    expect(selected).toEqual([strong.id]);
  });

  it("selects nothing when the budget is fully reserved", () => {
    const fx = buildQr("A");
    const t = blockT(fx.blocks[0]);
    const set = invertingConstraints(fx.matrix, 1);

    expect(
      selectConstraintDamage(set, fx.blocks, fx.matrix, {
        maxBudgetFraction: 0,
      })
    ).toEqual([]);
    expect(
      selectConstraintDamage(set, fx.blocks, fx.matrix, {
        safetyMargin: t,
      })
    ).toEqual([]);
  });

  it("uses the full budget when margin is 0 and fraction is 1", () => {
    const fx = buildQr("A");
    const t = blockT(fx.blocks[0]);
    const set = invertingConstraints(fx.matrix, 1);

    const selected = selectConstraintDamage(set, fx.blocks, fx.matrix, {
      safetyMargin: 0,
      maxBudgetFraction: 1,
    });
    const perBlock = damagedCodewordsPerBlock(fx, selected);
    expect(perBlock.get(0)?.size).toBe(t);
  });

  it("throws on constraint/matrix dimension mismatch", () => {
    const fx = buildQr("A");
    const set: ConstraintSet = {
      dimension: fx.dimension + 4,
      valueGrid: new Float32Array((fx.dimension + 4) ** 2),
      weightGrid: new Float32Array((fx.dimension + 4) ** 2),
    };
    expect(() =>
      selectConstraintDamage(set, fx.blocks, fx.matrix)
    ).toThrow(RangeError);
  });
});
