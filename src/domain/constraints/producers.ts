/**
 * Constraint producers — adapt existing data (image grids, QR matrices)
 * into the shared ConstraintSet model.
 */

import type { QRMatrix } from "@/domain/shared/types";
import type {
  ConstraintSet,
  ConstraintStrength,
  ModuleConstraint,
} from "./types";

function assertDimension(dimension: number): number {
  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new RangeError(
      `ConstraintSet dimension must be a positive integer, got ${dimension}`
    );
  }
  return dimension * dimension;
}

function assertGridLength(
  grid: Float32Array,
  size: number,
  name: string
): void {
  if (grid.length !== size) {
    throw new RangeError(
      `${name} length ${grid.length} does not match dimension² = ${size}`
    );
  }
}

/**
 * Build a ConstraintSet from the image-derived module grids.
 *
 * - `valueGrid` copies `targetGrid` (0 dark … 1 light).
 * - `weightGrid` stores the RAW, un-quantized weight
 *   `validContrast * (1 - roi)`, with the exact validity clamping used by
 *   the `roi` branch of buildBitOrder in qart/bitPriority.ts:
 *   contrast must be a finite number >= 0 (else 0); roi is clamped to
 *   [0, 1] and treated as 0 when `roiGrid` is absent. Quantization
 *   (QUANTIZATION_STEP, rounding, clamping to int32) stays in
 *   buildBitOrder and must NOT be applied here.
 *
 * Note: weights are computed in float64 and stored in a Float32Array, so
 * each stored weight is the float32 rounding of the raw product (contrast
 * and roi inputs are already float32-exact).
 *
 * Throws RangeError when any grid length does not match `dimension²`.
 */
export function constraintsFromImageGrids(
  targetGrid: Float32Array,
  contrastGrid: Float32Array,
  roiGrid: Float32Array | undefined,
  dimension: number
): ConstraintSet {
  const size = assertDimension(dimension);
  assertGridLength(targetGrid, size, "targetGrid");
  assertGridLength(contrastGrid, size, "contrastGrid");
  if (roiGrid) assertGridLength(roiGrid, size, "roiGrid");

  const valueGrid = new Float32Array(targetGrid);
  const weightGrid = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    const contrast = contrastGrid[i];
    const validContrast =
      typeof contrast === "number" && isFinite(contrast) && contrast >= 0
        ? contrast
        : 0;
    const roi =
      roiGrid && typeof roiGrid[i] === "number"
        ? Math.max(0, Math.min(1, roiGrid[i]))
        : 0;
    weightGrid[i] = validContrast * (1 - roi);
  }

  return { dimension, valueGrid, weightGrid };
}

export interface ConstraintsFromMatrixOptions {
  /** Weight assigned to every module constraint (default 1). */
  weight?: number;
  /** Strength assigned to every module constraint (default "preferred"). */
  strength?: ConstraintStrength;
}

/**
 * Build a ConstraintSet from a QR matrix — the matrix's rendered modules
 * become desired visual values (a second QR as a halftoning value source).
 *
 * - Dark module (`isDark`) => valueGrid 0; light module => valueGrid 1.
 * - Every module also gets a sparse item with `source: "matrix"`,
 *   `desiredValue: isDark`, and `bitId` when the module carries one.
 * - Missing modules (holes in a row) get neutral value 0.5, weight 0, and
 *   no item.
 */
export function constraintsFromMatrix(
  matrix: QRMatrix,
  options: ConstraintsFromMatrixOptions = {}
): ConstraintSet {
  const { weight = 1, strength = "preferred" } = options;
  const dimension = matrix.length;
  const size = assertDimension(dimension);

  const valueGrid = new Float32Array(size);
  const weightGrid = new Float32Array(size);
  const items: ModuleConstraint[] = [];

  for (let y = 0; y < dimension; y++) {
    const row = matrix[y] ?? [];
    for (let x = 0; x < dimension; x++) {
      const idx = y * dimension + x;
      const module = row[x];
      if (!module) {
        valueGrid[idx] = 0.5;
        weightGrid[idx] = 0;
        continue;
      }
      valueGrid[idx] = module.isDark ? 0 : 1;
      weightGrid[idx] = weight;
      const bitId = module.bitId || module.bit?.id;
      items.push({
        x,
        y,
        strength,
        desiredValue: module.isDark,
        weight,
        source: "matrix",
        ...(bitId ? { bitId } : {}),
      });
    }
  }

  return { dimension, items, valueGrid, weightGrid };
}
