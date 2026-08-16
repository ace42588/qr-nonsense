import type { QRMatrix, QRModule } from "@/domain/shared/types";
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
