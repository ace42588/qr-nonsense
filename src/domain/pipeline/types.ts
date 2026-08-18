/**
 * Typed generation pipeline: ports, context, nodes, and presets.
 */

import type { Input } from "@/state/inputs/types";
import type {
  Codeword,
  QRMatrix,
  Segment,
  VersionInfo,
} from "@/domain/shared/types";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { ImageData } from "@/domain/image";
import type { ImageQualityMetrics, EvaluationReport, EvaluateDecodePort } from "@/domain/evaluate";
import type { InstanceMaskResult } from "@/domain/isqr/segmentation";
import type {
  QArtAppendData,
  QArtOptimizedAppendData,
} from "@/domain/qart/types";
import type { AmbiguousStats } from "@/domain/ambiguous";
import type {
  BitPosition,
  PriorityFunctionType,
} from "@/domain/qart/bitPriority";
import type { QArtEditableSelection } from "@/domain/qart/stages";
import type { CsfOptions } from "@/domain/isqr/csf";
import type { ConstraintSet } from "@/domain/constraints";

/** Source image transferable across workers (HTMLImageElement is not). */
export type PipelineSourceImage =
  | HTMLImageElement
  | ImageBitmap
  | ImageData;

/** Edit-time port tags for wiring validation (not runtime classes). */
export type PortType =
  | "Inputs"
  | "InputsB"
  | "Format"
  | "Segments"
  | "Codewords"
  | "Blocks"
  | "Matrix"
  | "MatrixA"
  | "MatrixB"
  | "Image"
  | "Grid"
  | "Constraints"
  | "EditableSelection"
  | "BitOrders"
  | "Damage"
  | "Render"
  | "Report";

export type PipelineStage =
  | "payload"
  | "encode"
  | "codewords"
  | "matrix"
  | "optimize"
  | "mutate"
  | "raster"
  | "verify";

export type RenderIntent =
  | "modules"
  | "halftone"
  | "ambiguous"
  | "embed"
  | "isqr";

export interface GenerationContext {
  // Format
  version?: number;
  errorCorrectionLevel?: number;
  dataMask?: number | null;
  versionInfo?: VersionInfo;

  // Encode
  inputs?: Input[];
  inputsB?: Input[];
  segments?: Segment[];
  codewords?: Codeword[];
  blocks?: QRBlock[];
  matrix?: QRMatrix | null;
  encodeError?: string | null;
  invalidQR?: boolean;
  invalidQRReason?: string | null;

  // Dual
  matrixA?: QRMatrix | null;
  matrixB?: QRMatrix | null;
  errorA?: string | null;
  errorB?: string | null;
  invalidA?: boolean;
  invalidB?: boolean;
  invalidReasonA?: string | null;
  invalidReasonB?: string | null;
  ambiguousStats?: AmbiguousStats;
  phaseFlip?: boolean;

  // Image
  sourceImage?: PipelineSourceImage | null;
  transformParams?: {
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null;
  targetImage?: ImageData | null;
  offscreenCanvasImage?: ImageData | null;
  targetGrid?: Float32Array;
  contrastGrid?: Float32Array;
  roiGrid?: Float32Array;
  roiMeta?: InstanceMaskResult;

  // Constraints (shared visual-intent model; grids above stay the hot path)
  constraints?: ConstraintSet;

  // QArt split-optimizer slices (transient intermediates produced by
  // qartSelectEditable / qartBitPriority and consumed by qartSolve)
  editableSelection?: QArtEditableSelection;
  bitOrders?: BitPosition[][];

  // QArt / IS-QR
  controlMatrix?: QRMatrix;
  decodeSuccessRate?: number;
  visualError?: number;
  fusedImage?: ImageData | null;
  metrics?: ImageQualityMetrics;
  evaluation?: EvaluationReport;
  scannabilityWarning?: string | null;
  optimizedAppendData?: QArtOptimizedAppendData;
  controlledBits?: Map<string, boolean>;

  // Mutation
  damagedModuleIds?: string[];

  // Render intent (domain does not always paint canvas)
  renderIntent?: RenderIntent;
  modulePixel?: number;
  centerSeed?: number;
  polarityStrength?: number;

  // Params carried for stage nodes
  appendData?: QArtAppendData;
  priorityFunction?: PriorityFunctionType;
  minDecodeRedundancy?: number;
  decodeTrials?: number;
  maskImage?: ImageData | null;
  roiThresholdBias?: number;
  csf?: CsfOptions;
  qrBlend?: number;

  // Run
  signal?: AbortSignal;
  /** Injected decode port (DIP). Workers set an OffscreenCanvas implementation. */
  decodePort?: EvaluateDecodePort;
  /** Skip SSIM/FSIM/GMSD so first paint is not blocked on image metrics. */
  deferImageMetrics?: boolean;
}

export type NodeParams = Record<string, unknown>;

export interface PipelineNode {
  id: string;
  stage: PipelineStage;
  in: PortType[];
  out: PortType[];
  /**
   * When true, node may be omitted if its enabling param is false
   * (e.g. qartAppend when appendData.enabled is false).
   */
  optional?: boolean;
  run: (
    ctx: GenerationContext,
    params?: NodeParams
  ) => GenerationContext | Promise<GenerationContext>;
}

export interface PresetGraph {
  id: string;
  label: string;
  /** Ordered node ids (linear v1). */
  nodes: string[];
}

export type PresetId =
  | "qr"
  | "hqr"
  | "qart"
  | "combined"
  | "isqr"
  | "ambiguous"
  | "embed"
  | "damage";
