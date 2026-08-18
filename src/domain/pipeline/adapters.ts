/**
 * Adapters between legacy generate* option bags and GenerationContext.
 */

import type { QArtOptions, QArtResult } from "@/domain/qart/types";
import type { IsqrOptions, IsqrResult } from "@/domain/isqr/generate";
import { computeIsqrMetrics } from "@/domain/isqr/stages";
import type { AmbiguousOptions, AmbiguousResult } from "@/domain/ambiguous";
import type { EmbedOptions, EmbedResult } from "@/domain/embed";
import { cloneContextForFrame, createGenerationContext } from "./context";
import { runPipeline } from "./runner";
import { QART_FROM_MATRIX_NODES, ISQR_FROM_MATRIX_NODES } from "./presets";
import type { GenerationContext, PipelineSourceImage } from "./types";
import { PipelineError } from "./run";
import {
  ANIMATION_FRAME_CONCURRENCY,
  mapLimit,
} from "@/utils/mapLimit";
import type { ImageData } from "@/domain/image";

const QART_APPEND_NODES = ["qartAppend"] as const;
const QART_FRAME_NODES = [
  "rasterize",
  "qartOptimize",
  "qartRebuild",
  "evaluate",
] as const;

export interface QArtFrameSource {
  targetImage: ImageData;
  sourceImage?: PipelineSourceImage | null;
}

function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new PipelineError("Pipeline run was cancelled");
  }
}

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
  const ctx = await runPipeline(
    [...QART_FROM_MATRIX_NODES],
    contextFromQArtOptions(options)
  );
  return qartResultFromContext(ctx);
}

/**
 * Run qartAppend once, then rasterize/optimize each frame with limited parallelism.
 */
export async function generateQArtForFrames(
  options: QArtOptions,
  frames: QArtFrameSource[],
  onProgress?: (current: number, total: number) => void
): Promise<QArtResult[]> {
  if (frames.length === 0) return [];
  assertNotCancelled(options.signal);

  const baseOptions = {
    ...options,
    targetImage: frames[0].targetImage,
    sourceImage: frames[0].sourceImage ?? options.sourceImage,
  };
  const appended = await runPipeline(
    [...QART_APPEND_NODES],
    contextFromQArtOptions(baseOptions)
  );
  assertNotCancelled(options.signal);

  let completed = 0;
  const total = frames.length;
  return mapLimit(frames, ANIMATION_FRAME_CONCURRENCY, async (frame) => {
    assertNotCancelled(options.signal);
    const frameCtx = cloneContextForFrame(appended);
    frameCtx.targetImage = frame.targetImage;
    frameCtx.sourceImage = frame.sourceImage ?? undefined;
    frameCtx.transformParams = options.transformParams ?? appended.transformParams;
    frameCtx.signal = options.signal;
    const out = await runPipeline([...QART_FRAME_NODES], frameCtx);
    completed += 1;
    onProgress?.(completed, total);
    return qartResultFromContext(out);
  });
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
  const ctx = await runPipeline(
    "ambiguous",
    contextFromDualOptions(options)
  );
  return ambiguousResultFromContext(ctx);
}

export async function generateEmbedViaPipeline(
  options: EmbedOptions
): Promise<EmbedResult> {
  const ctx = await runPipeline("embed", contextFromDualOptions(options));
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
  if (!ctx.fusedImage || !ctx.roiMeta || !ctx.roiGrid) {
    throw new Error("IS-QR pipeline finished without fusion/metrics");
  }
  const reference =
    ctx.targetImage ?? ctx.offscreenCanvasImage ?? ctx.fusedImage;
  const metrics =
    ctx.metrics ?? computeIsqrMetrics(reference, ctx.fusedImage);
  return {
    qart,
    roi: ctx.roiMeta,
    roiGrid: ctx.roiGrid,
    fusedImage: ctx.fusedImage,
    metrics,
    instanceCount: ctx.roiMeta.instanceCount,
  };
}

export async function generateIsqrViaPipeline(
  options: IsqrOptions
): Promise<IsqrResult> {
  const ctx = await runPipeline(
    [...ISQR_FROM_MATRIX_NODES],
    contextFromIsqrOptions(options)
  );
  return isqrResultFromContext(ctx, qartResultFromContext(ctx));
}

export interface IsqrFrameSource {
  transformedImage: ImageData;
  sourceImage?: PipelineSourceImage | null;
}

/**
 * Clone shared encode/matrix context once, then run IS-QR nodes per frame.
 */
export async function generateIsqrForFrames(
  options: IsqrOptions,
  frames: IsqrFrameSource[],
  onProgress?: (current: number, total: number) => void
): Promise<IsqrResult[]> {
  if (frames.length === 0) return [];
  assertNotCancelled(options.qart.signal);

  const shared = contextFromIsqrOptions({
    ...options,
    transformedImage: frames[0].transformedImage,
    qart: {
      ...options.qart,
      targetImage: frames[0].transformedImage,
      sourceImage: frames[0].sourceImage ?? options.qart.sourceImage,
      priorityFunction: options.qart.priorityFunction ?? "roi",
    },
  });

  let completed = 0;
  const total = frames.length;
  return mapLimit(frames, ANIMATION_FRAME_CONCURRENCY, async (frame) => {
    assertNotCancelled(options.qart.signal);
    const frameCtx = cloneContextForFrame(shared);
    frameCtx.targetImage = frame.transformedImage;
    frameCtx.sourceImage = frame.sourceImage ?? undefined;
    frameCtx.maskImage = options.maskImage;
    frameCtx.roiThresholdBias = options.roiThresholdBias;
    frameCtx.modulePixel = options.modulePixel;
    frameCtx.csf = options.csf;
    frameCtx.qrBlend = options.qrBlend;
    frameCtx.transformParams =
      options.qart.transformParams ?? shared.transformParams;
    frameCtx.signal = options.qart.signal;
    const out = await runPipeline([...ISQR_FROM_MATRIX_NODES], frameCtx);
    completed += 1;
    onProgress?.(completed, total);
    return isqrResultFromContext(out, qartResultFromContext(out));
  });
}
