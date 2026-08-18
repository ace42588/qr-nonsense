/**
 * Dense/sparse reconciliation for ConstraintSets.
 *
 * Merge precedence (documented contract):
 * 1. Dense `valueGrid`/`weightGrid` are the base layer.
 * 2. Any sparse item overrides the dense cell it targets.
 * 3. When several items target the same cell, exactly one wins the cell:
 *    higher strength first (required > preferred > optional), then higher
 *    weight, then the later item in `items` order.
 * 4. The winning item always sets the cell's weight to `item.weight`; it
 *    sets the cell's value from `desiredValue` (dark => 0, light => 1)
 *    only when `desiredValue` is defined, otherwise the dense value is
 *    kept. Losing items are ignored entirely.
 */

import type {
  ConstraintGrids,
  ConstraintSet,
  ConstraintStrength,
  ModuleConstraint,
} from "./types";

const STRENGTH_RANK: Record<ConstraintStrength, number> = {
  required: 2,
  preferred: 1,
  optional: 0,
};

function assertSetShape(set: ConstraintSet): number {
  const { dimension, valueGrid, weightGrid } = set;
  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new RangeError(
      `ConstraintSet dimension must be a positive integer, got ${dimension}`
    );
  }
  const size = dimension * dimension;
  if (valueGrid.length !== size) {
    throw new RangeError(
      `valueGrid length ${valueGrid.length} does not match dimension² = ${size}`
    );
  }
  if (weightGrid.length !== size) {
    throw new RangeError(
      `weightGrid length ${weightGrid.length} does not match dimension² = ${size}`
    );
  }
  return size;
}

function assertItemInBounds(
  item: ModuleConstraint,
  dimension: number
): void {
  if (
    !Number.isInteger(item.x) ||
    !Number.isInteger(item.y) ||
    item.x < 0 ||
    item.y < 0 ||
    item.x >= dimension ||
    item.y >= dimension
  ) {
    throw new RangeError(
      `Constraint item at (${item.x}, ${item.y}) is outside a ` +
        `${dimension}×${dimension} grid`
    );
  }
}

/** Candidate beats incumbent per precedence rule 3 above. */
function beats(
  candidate: ModuleConstraint,
  incumbent: ModuleConstraint
): boolean {
  const rankDiff =
    STRENGTH_RANK[candidate.strength] - STRENGTH_RANK[incumbent.strength];
  if (rankDiff !== 0) return rankDiff > 0;
  // Equal strength: higher weight wins; full tie -> later item wins.
  return candidate.weight >= incumbent.weight;
}

/**
 * Fold sparse `items` into fresh dense grids and return a ConstraintSet
 * without items. The input set is not mutated. Throws RangeError on
 * dimension mismatches or out-of-bounds items.
 */
export function mergeConstraintItems(set: ConstraintSet): ConstraintSet {
  assertSetShape(set);

  const valueGrid = new Float32Array(set.valueGrid);
  const weightGrid = new Float32Array(set.weightGrid);

  if (set.items && set.items.length > 0) {
    const winners = new Map<number, ModuleConstraint>();
    for (const item of set.items) {
      assertItemInBounds(item, set.dimension);
      const idx = item.y * set.dimension + item.x;
      const incumbent = winners.get(idx);
      if (!incumbent || beats(item, incumbent)) {
        winners.set(idx, item);
      }
    }
    for (const [idx, item] of winners) {
      weightGrid[idx] = item.weight;
      if (item.desiredValue !== undefined) {
        valueGrid[idx] = item.desiredValue ? 0 : 1;
      }
    }
  }

  return { dimension: set.dimension, valueGrid, weightGrid };
}

/**
 * Resolve a ConstraintSet to its dense grid view (sparse items applied
 * per the merge precedence above). Returns fresh arrays; the set is not
 * mutated.
 */
export function constraintsToGrids(set: ConstraintSet): ConstraintGrids {
  const merged = mergeConstraintItems(set);
  return {
    dimension: merged.dimension,
    valueGrid: merged.valueGrid,
    weightGrid: merged.weightGrid,
  };
}
