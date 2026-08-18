import type { Codeword, QRMatrix, QRModule, Segment } from "@/domain/shared/types";
import { attachModuleIndex } from "@/domain/qr/matrix/utils";
import { deepCopyBlock } from "@/domain/qart/stages";
import type { GenerationContext, PortType } from "./types";

/**
 * Create an empty generation context, optionally seeded with initial fields.
 */
export function createGenerationContext(
  seed: Partial<GenerationContext> = {}
): GenerationContext {
  return { ...seed };
}

/**
 * Shallow clone. Matrices/arrays are shared unless callers replace them.
 * Prefer withMatrix/withBlocks when replacing identity-sensitive slices.
 */
export function cloneContext(ctx: GenerationContext): GenerationContext {
  return {
    ...ctx,
    controlledBits: ctx.controlledBits
      ? new Map(ctx.controlledBits)
      : undefined,
    damagedModuleIds: ctx.damagedModuleIds
      ? [...ctx.damagedModuleIds]
      : undefined,
  };
}

/**
 * Re-attach getModuleByBitId after matrix row copies.
 */
export function attachMatrixLookup(matrix: QRMatrix): QRMatrix {
  if (typeof matrix.getModuleByBitId === "function") {
    return matrix;
  }
  const byBitId = new Map<string, QRModule>();
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < (matrix[y]?.length ?? 0); x++) {
      const m = matrix[y][x];
      if (m?.bit?.id) byBitId.set(m.bit.id, m);
      if (m?.bitId) byBitId.set(m.bitId, m);
    }
  }
  matrix.getModuleByBitId = (bitId: string) => byBitId.get(bitId);
  return matrix;
}

export function withMatrix(
  ctx: GenerationContext,
  matrix: QRMatrix | null | undefined
): GenerationContext {
  return {
    ...ctx,
    matrix: matrix ? attachMatrixLookup(matrix) : matrix,
  };
}

export function withBlocks(
  ctx: GenerationContext,
  blocks: GenerationContext["blocks"],
  codewords?: GenerationContext["codewords"]
): GenerationContext {
  return {
    ...ctx,
    blocks,
    ...(codewords !== undefined ? { codewords } : {}),
  };
}

function cloneMatrix(matrix: QRMatrix): QRMatrix {
  const rows = matrix.map((row) =>
    row.map((m) => {
      if (!m) return m;
      return {
        ...m,
        bit: m.bit ? { ...m.bit } : m.bit,
        source: m.source ? { ...m.source } : m.source,
      };
    })
  ) as QRMatrix;
  attachModuleIndex(rows, true);
  return attachMatrixLookup(rows);
}

function cloneCodeword(codeword: Codeword): Codeword {
  return {
    ...codeword,
    bits: codeword.bits.map((bit) => ({ ...bit })),
    source: codeword.source ? { ...codeword.source } : codeword.source,
  };
}

function cloneSegment(segment: Segment): Segment {
  return {
    ...segment,
    bitIds: segment.bitIds ? [...segment.bitIds] : segment.bitIds,
  };
}

/**
 * Deep-clone encode/append outputs so parallel per-frame solves cannot mutate
 * a shared matrix or block list. Image buffers are left unset for the caller.
 */
export function cloneContextForFrame(ctx: GenerationContext): GenerationContext {
  const next = cloneContext(ctx);
  if (next.matrix) next.matrix = cloneMatrix(next.matrix);
  if (next.controlMatrix) next.controlMatrix = cloneMatrix(next.controlMatrix);
  if (next.matrixA) next.matrixA = cloneMatrix(next.matrixA);
  if (next.matrixB) next.matrixB = cloneMatrix(next.matrixB);
  if (next.blocks) next.blocks = next.blocks.map(deepCopyBlock);
  if (next.codewords) next.codewords = next.codewords.map(cloneCodeword);
  if (next.segments) next.segments = next.segments.map(cloneSegment);
  next.targetImage = undefined;
  next.sourceImage = undefined;
  next.offscreenCanvasImage = undefined;
  next.fusedImage = undefined;
  next.roiGrid = undefined;
  next.roiMeta = undefined;
  next.metrics = undefined;
  next.evaluation = undefined;
  next.contrastGrid = undefined;
  next.targetGrid = undefined;
  next.constraints = undefined;
  next.editableSelection = undefined;
  next.bitOrders = undefined;
  next.controlledBits = undefined;
  next.decodeSuccessRate = undefined;
  next.visualError = undefined;
  next.optimizedAppendData = undefined;
  next.scannabilityWarning = undefined;
  next.signal = undefined;
  return next;
}

/** Map port tags to context fields that satisfy them. */
const PORT_FIELDS: Record<PortType, (ctx: GenerationContext) => boolean> = {
  Inputs: (c) => Array.isArray(c.inputs),
  InputsB: (c) => Array.isArray(c.inputsB),
  Format: (c) =>
    typeof c.errorCorrectionLevel === "number" &&
    (typeof c.version === "number" || c.versionInfo != null),
  Segments: (c) => Array.isArray(c.segments),
  Codewords: (c) => Array.isArray(c.codewords),
  Blocks: (c) => Array.isArray(c.blocks),
  Matrix: (c) => c.matrix != null && Array.isArray(c.matrix),
  MatrixA: (c) => c.matrixA != null && Array.isArray(c.matrixA),
  MatrixB: (c) => c.matrixB != null && Array.isArray(c.matrixB),
  Image: (c) =>
    c.targetImage != null ||
    c.offscreenCanvasImage != null ||
    c.sourceImage != null ||
    c.fusedImage != null,
  Grid: (c) =>
    c.targetGrid != null || c.contrastGrid != null || c.roiGrid != null,
  Constraints: (c) => c.constraints != null,
  EditableSelection: (c) => c.editableSelection != null,
  BitOrders: (c) => Array.isArray(c.bitOrders),
  Damage: (c) => Array.isArray(c.damagedModuleIds),
  Render: (c) => c.renderIntent != null || c.fusedImage != null,
  Report: (c) =>
    c.evaluation != null ||
    c.decodeSuccessRate != null ||
    c.metrics != null ||
    c.scannabilityWarning !== undefined,
};

export function contextHasPort(
  ctx: GenerationContext,
  port: PortType
): boolean {
  return PORT_FIELDS[port](ctx);
}

export function missingPorts(
  ctx: GenerationContext,
  ports: PortType[]
): PortType[] {
  return ports.filter((p) => !contextHasPort(ctx, p));
}
