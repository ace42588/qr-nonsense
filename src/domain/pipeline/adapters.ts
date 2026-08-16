/**
 * Adapters between legacy generate* option bags and GenerationContext.
 */

import type { QArtOptions, QArtResult } from "@/domain/qart/types";
import type { IsqrOptions, IsqrResult } from "@/domain/isqr/generate";
import type { AmbiguousOptions, AmbiguousResult } from "@/domain/ambiguous";
import type { EmbedOptions, EmbedResult } from "@/domain/embed";
import { createGenerationContext } from "./context";
import { runGraph } from "./run";
import { QART_FROM_MATRIX_NODES } from "./presets";
import type { GenerationContext } from "./types";

export function contextFromQArtOptions(
  options: QArtOptions
): GenerationContext {
  return createGenerationContext({
    segments: options.segments,
    codewords: options.codewords,
    blocks: options.blocks,
    matrix: options.initialMatrix,
    versionInfo: options.versionInfo,
    version: options.versionInfo.version,
    errorCorrectionLevel: options.errorCorrectionLevel,
    targetImage: options.targetImage,
    sourceImage: options.sourceImage,
    transformParams: options.transformParams,
    appendData: options.appendData,
    priorityFunction: options.priorityFunction,
    minDecodeRedundancy: options.minDecodeRedundancy,
    decodeTrials: options.decodeTrials,
    roiGrid: options.roiGrid,
    targetGrid: options.targetGridOverride,
    signal: options.signal,
    dataMask: 0,
  });
}

export function qartResultFromContext(ctx: GenerationContext): QArtResult {
  if (!ctx.matrix) {
    throw new Error("QArt pipeline finished without a matrix");
  }
  return {
    matrix: ctx.matrix,
    dataMask: typeof ctx.dataMask === "number" ? ctx.dataMask : 0,
    segments: ctx.segments ?? [],
    error: ctx.visualError ?? 0,
    decodeSuccessRate: ctx.decodeSuccessRate ?? 0,
    controlMatrix: ctx.controlMatrix,
    contrastGrid: ctx.contrastGrid,
    optimizedAppendData: ctx.optimizedAppendData,
    offscreenCanvasImage: ctx.offscreenCanvasImage ?? undefined,
    scannabilityWarning: ctx.scannabilityWarning,
    evaluation: ctx.evaluation,
  };
}

/**
 * Run QArt stages via the pipeline when context already has encode outputs.
 */
export async function generateQArtViaPipeline(
  options: QArtOptions
): Promise<QArtResult> {
  const ctx = await runGraph(
    [...QART_FROM_MATRIX_NODES],
    contextFromQArtOptions(options)
  );
  return qartResultFromContext(ctx);
}

export function contextFromDualOptions(
  options: AmbiguousOptions | EmbedOptions
): GenerationContext {
  return createGenerationContext({
    inputs: options.inputsA,
    inputsB: options.inputsB,
    version: options.version,
    errorCorrectionLevel: options.errorCorrectionLevel,
    dataMask: options.dataMask,
    phaseFlip: "phaseFlip" in options ? Boolean(options.phaseFlip) : undefined,
    centerSeed: "centerSeed" in options ? options.centerSeed : undefined,
    polarityStrength:
      "polarityStrength" in options ? options.polarityStrength : undefined,
    modulePixel: "modulePixel" in options ? options.modulePixel : undefined,
    csf: "csf" in options ? options.csf : undefined,
  });
}

export function ambiguousResultFromContext(
  ctx: GenerationContext
): AmbiguousResult {
  return {
    matrixA: ctx.matrixA ?? null,
    matrixB: ctx.matrixB ?? null,
    version: ctx.version ?? 1,
    dataMask: typeof ctx.dataMask === "number" ? ctx.dataMask : 0,
    errorA: ctx.errorA ?? null,
    errorB: ctx.errorB ?? null,
    invalidA: Boolean(ctx.invalidA),
    invalidB: Boolean(ctx.invalidB),
    invalidReasonA: ctx.invalidReasonA ?? null,
    invalidReasonB: ctx.invalidReasonB ?? null,
    stats: ctx.ambiguousStats ?? {
      agreeCount: 0,
      disagreeCount: 0,
      totalModules: 0,
    },
    phaseFlip: Boolean(ctx.phaseFlip),
  };
}

export function embedResultFromContext(ctx: GenerationContext): EmbedResult {
  return {
    matrixA: ctx.matrixA ?? null,
    matrixB: ctx.matrixB ?? null,
    version: ctx.version ?? 1,
    dataMask: typeof ctx.dataMask === "number" ? ctx.dataMask : 0,
    errorA: ctx.errorA ?? null,
    errorB: ctx.errorB ?? null,
    invalidA: Boolean(ctx.invalidA),
    invalidB: Boolean(ctx.invalidB),
    invalidReasonA: ctx.invalidReasonA ?? null,
    invalidReasonB: ctx.invalidReasonB ?? null,
    fusedImage: ctx.fusedImage ?? null,
    modulePixel: ctx.modulePixel ?? 9,
    centerSeed: ctx.centerSeed ?? 0.35,
  };
}

export async function generateAmbiguousViaPipeline(
  options: AmbiguousOptions
): Promise<AmbiguousResult> {
  const ctx = await runGraph(
    "ambiguous",
    contextFromDualOptions(options)
  );
  return ambiguousResultFromContext(ctx);
}

export async function generateEmbedViaPipeline(
  options: EmbedOptions
): Promise<EmbedResult> {
  const ctx = await runGraph("embed", contextFromDualOptions(options));
  return embedResultFromContext(ctx);
}

export function contextFromIsqrOptions(
  options: IsqrOptions
): GenerationContext {
  const base = contextFromQArtOptions(options.qart);
  return {
    ...base,
    targetImage: options.transformedImage,
    maskImage: options.maskImage,
    roiThresholdBias: options.roiThresholdBias,
    modulePixel: options.modulePixel,
    csf: options.csf,
    qrBlend: options.qrBlend,
    inputs: options.qart.segments
      ? base.inputs
      : base.inputs,
  };
}

export function isqrResultFromContext(
  ctx: GenerationContext,
  qart: QArtResult
): IsqrResult {
  if (!ctx.fusedImage || !ctx.roiMeta || !ctx.roiGrid || !ctx.metrics) {
    throw new Error("IS-QR pipeline finished without fusion/metrics");
  }
  return {
    qart,
    roi: ctx.roiMeta,
    roiGrid: ctx.roiGrid,
    fusedImage: ctx.fusedImage,
    metrics: ctx.metrics,
    instanceCount: ctx.roiMeta.instanceCount,
  };
}
