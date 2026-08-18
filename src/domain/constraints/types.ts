/**
 * Shared constraint model — the common currency for visual intent.
 *
 * Producers (image grids, ROI, a second QR matrix, user edits) express
 * "what each module should look like and how much it matters" as a
 * ConstraintSet. Consumers (QArt optimizer, damage overlay, renderers)
 * read the dense grids as the hot path.
 */

export type ConstraintStrength = "required" | "preferred" | "optional";

/** Well-known producers plus free-form extension. */
export type ConstraintSource = "image" | "roi" | "matrix" | "user" | string;

export interface ModuleConstraint {
  x: number;
  y: number;
  strength: ConstraintStrength;
  /** Desired visual darkness (pre-mask); consumers apply mask semantics. */
  desiredValue?: boolean;
  weight: number;
  source: ConstraintSource;
  /** Optional link into existing Bit provenance. */
  bitId?: string;
}

export interface ConstraintSet {
  dimension: number;
  /** Sparse authoring form (user edits, logo regions). */
  items?: ModuleConstraint[];
  /** Dense hot path (== targetGrid semantics: 0 dark … 1 light). */
  valueGrid: Float32Array;
  /**
   * Dense priority/weight per module. Stores RAW, un-quantized weights;
   * quantization (QUANTIZATION_STEP) is a consumer concern and lives in
   * qart/bitPriority.ts buildBitOrder.
   */
  weightGrid: Float32Array;
}

/** Dense grid view returned by constraintsToGrids. */
export interface ConstraintGrids {
  dimension: number;
  valueGrid: Float32Array;
  weightGrid: Float32Array;
}
