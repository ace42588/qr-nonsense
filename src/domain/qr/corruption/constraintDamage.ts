/**
 * Constraint-driven damage selection — the second ConstraintSet consumer.
 *
 * Where the QArt optimizer changes *which codewords are encoded* to match
 * a visual target, this overlay flips already-rendered modules, spending
 * Reed-Solomon error-correction budget instead of encode freedom.
 */

import type { QRBlock } from "../codewords/blocks";
import type { QRMatrix } from "../../shared/types";
import type { ConstraintSet } from "../../constraints";
import { buildBitIdIndex } from "../reedsolomon/applyFlips";

/**
 * Default codewords of correction budget left untouched per block.
 *
 * Per RS block, up to t = floor(ecCodewords/2) codeword errors are
 * correctable. Spending all t leaves zero tolerance for real-world scan
 * noise (print defects, glare, perspective), so by default we reserve one
 * codeword of slack per block and damage at most t - 1 codewords.
 */
export const DEFAULT_SAFETY_MARGIN = 1;

export interface ConstraintDamageOptions {
  /**
   * Codewords of correction budget to leave unused per block
   * (default {@link DEFAULT_SAFETY_MARGIN}). Values are floored and
   * clamped to >= 0.
   */
  safetyMargin?: number;
  /**
   * Fraction (0..1) of each block's correctable budget t that may be
   * spent, applied before the safety margin (default 1). The effective
   * per-block cap is min(floor(t * maxBudgetFraction), t - safetyMargin).
   */
  maxBudgetFraction?: number;
  /**
   * Candidates with weight below this threshold are skipped (default 0).
   * Zero-weight modules are never selected regardless: weight 0 means
   * "no visual intent", so damaging them would waste budget.
   */
  minWeight?: number;
}

interface DamageCandidate {
  id: string;
  x: number;
  y: number;
  weight: number;
  blockIndex: number;
  byteIndex: number;
}

function usableCodewordsPerBlock(
  blocks: QRBlock[],
  options: ConstraintDamageOptions
): number[] {
  const fraction = Math.max(0, Math.min(1, options.maxBudgetFraction ?? 1));
  const margin = Math.max(
    0,
    Math.floor(options.safetyMargin ?? DEFAULT_SAFETY_MARGIN)
  );
  return blocks.map((block) => {
    const t = Math.floor(block.errorCorrection.length / 2);
    return Math.max(0, Math.min(Math.floor(t * fraction), t - margin));
  });
}

/**
 * Select module ids to visually damage so the rendered matrix moves
 * toward the ConstraintSet's desired values, without exceeding the
 * per-block Reed-Solomon correction budget.
 *
 * Candidates are non-function (not `nonData`) modules whose rendered
 * `isDark` differs from the desired value (`valueGrid < 0.5` means
 * desired dark), ranked by `weightGrid` descending with a deterministic
 * tie-break (y then x ascending).
 *
 * Budget accounting: damaging any bit of a codeword corrupts that whole
 * codeword, so candidates are grouped by their (block, codeword) via
 * {@link buildBitIdIndex}. A block accepts new codewords until its usable
 * budget (see {@link ConstraintDamageOptions}) is exhausted; further
 * modules inside already-damaged codewords remain free. Modules whose
 * bits belong to no codeword (e.g. remainder bits) are skipped because
 * their budget cost cannot be attributed.
 *
 * Returns module ids in selection (rank) order. Deterministic for
 * identical inputs.
 */
export function selectConstraintDamage(
  constraints: ConstraintSet,
  blocks: QRBlock[],
  matrix: QRMatrix,
  options: ConstraintDamageOptions = {}
): string[] {
  const dimension = matrix.length;
  if (dimension === 0 || blocks.length === 0) return [];
  if (constraints.dimension !== dimension) {
    throw new RangeError(
      `ConstraintSet dimension ${constraints.dimension} does not match matrix dimension ${dimension}`
    );
  }

  const { valueGrid, weightGrid } = constraints;
  const minWeight = options.minWeight ?? 0;
  const bitIndex = buildBitIdIndex(blocks);

  const candidates: DamageCandidate[] = [];
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y]?.[x];
      if (!m?.id || m.nonData) continue;

      const idx = y * dimension + x;
      const weight = weightGrid[idx];
      if (!(weight > 0) || weight < minWeight) continue;

      const desiredDark = valueGrid[idx] < 0.5;
      if (desiredDark === m.isDark) continue;

      const bitId = m.bit?.id || m.bitId;
      const loc = bitId ? bitIndex.get(bitId) : undefined;
      if (!loc) continue;

      candidates.push({
        id: m.id,
        x,
        y,
        weight,
        blockIndex: loc.blockIndex,
        byteIndex: loc.byteIndex,
      });
    }
  }

  candidates.sort(
    (a, b) => b.weight - a.weight || a.y - b.y || a.x - b.x
  );

  const usable = usableCodewordsPerBlock(blocks, options);
  const consumedByBlock: Set<number>[] = blocks.map(() => new Set());
  const selected: string[] = [];

  for (const c of candidates) {
    const consumed = consumedByBlock[c.blockIndex];
    if (consumed.has(c.byteIndex)) {
      // Codeword already corrupted — more bits in it are free.
      selected.push(c.id);
      continue;
    }
    if (consumed.size >= usable[c.blockIndex]) continue;
    consumed.add(c.byteIndex);
    selected.push(c.id);
  }

  return selected;
}
