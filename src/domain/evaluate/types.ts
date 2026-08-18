/**
 * Unified QR evaluation types — comparable metrics, not pass/fail.
 */

import type { QRMatrix, VersionInfo } from "@/domain/shared/types";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { ImageData } from "@/domain/image";
import type { AmbiguousStats } from "@/domain/ambiguous";
import type { ImageQualityMetrics } from "./imageMetrics";

export type MetricDirection = "higherBetter" | "lowerBetter";

export type IsoGrade = "A" | "B" | "C" | "D" | "F";

export interface MetricValue {
  id: string;
  value: number;
  unit: string;
  direction: MetricDirection;
  grade?: IsoGrade;
  details?: Record<string, number | string | boolean | null>;
}

export interface MaskPenaltyBreakdown {
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  total: number;
}

export interface RsBlockBudget {
  blockIndex: number;
  t: number;
  errorsCorrected: number;
  remaining: number;
  ok: boolean;
}

export interface RsBudgetSummary {
  blocks: RsBlockBudget[];
  remainingBudget: number;
  worstBlockRemaining: number;
  allOk: boolean;
}

export interface ScannabilityTrial {
  trial: number;
  success: boolean;
  payload: string | null;
  matchedExpected: boolean | null;
}

export interface ScannabilityResult {
  successRate: number;
  payloadMatchRate: number | null;
  trials: ScannabilityTrial[];
  /** When decoding rendered pixels rather than logical matrix */
  source: "matrix" | "rendered" | "matrixA" | "matrixB";
}

export interface VisualFidelityResult {
  meanAbsoluteError: number;
  polarityAgreement: number;
  contrastWeightedError: number | null;
  mismatchCount: number;
  controllableModules: number;
}

export interface PrintQualityResult {
  symbolContrast: MetricValue;
  modulation: MetricValue;
  fixedPatternDamage: MetricValue;
  axialNonuniformity: MetricValue;
  gridNonuniformity: MetricValue;
  formatInformationDamage: MetricValue;
  overallGrade: IsoGrade;
}

export interface EvaluationIdentity {
  version: number;
  errorCorrectionLevel: number;
  dataMask: number | null;
  dimension: number;
  moduleCount: number;
}

export interface EvaluationReport {
  identity: EvaluationIdentity;
  metrics: MetricValue[];
  scannability?: ScannabilityResult[];
  structure?: {
    penalty: MaskPenaltyBreakdown;
    paddingBitRatio?: number;
    controlRatio?: number;
  };
  reedSolomon?: RsBudgetSummary;
  /** RS after recovering modules from rendered image */
  recoveredReedSolomon?: RsBudgetSummary;
  visual?: VisualFidelityResult;
  image?: ImageQualityMetrics;
  print?: PrintQualityResult;
  dual?: AmbiguousStats & { disagreementRatio: number };
  capacity?: {
    availableCapacity: number;
    qartRequirement: number;
    hasCapacity: boolean;
  };
  /** Compatibility: threshold warning text */
  scannabilityWarning?: string | null;
}

export interface EvaluateInput {
  matrix: QRMatrix;
  version?: number;
  errorCorrectionLevel?: number;
  dataMask?: number | null;
  versionInfo?: VersionInfo;
  blocks?: QRBlock[];
  targetGrid?: Float32Array;
  contrastGrid?: Float32Array;
  roiGrid?: Float32Array;
  controlledBits?: Map<string, boolean>;
  /** Reference image for full-reference metrics */
  referenceImage?: ImageData | null;
  /** Fused / halftone / embed render */
  renderedImage?: ImageData | null;
  expectedPayload?: string | null;
  expectedPayloadB?: string | null;
  matrixA?: QRMatrix | null;
  matrixB?: QRMatrix | null;
  decodeTrials?: number;
  minDecodeRedundancy?: number;
  /** Quiet zone modules when sampling rendered image (default 4) */
  quietZone?: number;
  /** User input bit count for capacity section */
  userInputBits?: number;
  targetImageForCapacity?: ImageData | null;
  /** Skip SSIM/FSIM/GMSD (fill in later). */
  deferImageMetrics?: boolean;
}

export interface DecodeTrialResult {
  success: boolean;
  payload: string | null;
}

export interface EvaluateDecodePort {
  /** Decode logical matrix with optional perturbations across trials */
  decodeMatrixTrials(
    matrix: QRMatrix,
    trials: number
  ): Promise<DecodeTrialResult[]>;
  /** Decode raw ImageData (already includes quiet zone / render) */
  decodeImageData?(
    image: ImageData,
    trials: number
  ): Promise<DecodeTrialResult[]>;
}

export interface EvaluateDeps {
  decode?: EvaluateDecodePort;
}

export interface MetricDelta {
  id: string;
  a: number;
  b: number;
  /** Positive means B is better than A given direction */
  signedImprovement: number;
  direction: MetricDirection;
}

export interface EvaluationDiff {
  deltas: MetricDelta[];
}
