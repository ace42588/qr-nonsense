/**
 * Main-thread pipeline scheduler: batch sequential nodes, shard qartSolve,
 * then resume. No nested workers.
 */

import { getPreset, resolvePresetNodes } from "@/domain/pipeline/presets";
import { runGraph, PipelineError } from "@/domain/pipeline/run";
import { cloneContext } from "@/domain/pipeline/context";
import { verifyOptimizedBlocks } from "@/domain/qart/stages";
import { ReedSolomonEncoder } from "@/domain/qr/reedsolomon";
import type {
  GenerationContext,
  PresetId,
} from "@/domain/pipeline/types";
import type { RunGraphOptions } from "@/domain/pipeline/run";
import { getWorkerPool, JobCancelledError } from "./pool";
import { resizeImageDataNearest } from "@/domain/image";
import { computeIsqrMetrics } from "@/domain/isqr/stages";
import {
  serializeContext,
  hydrateContext,
  serializeMatrixForWorker,
  bitmapFromHtmlImage,
} from "./serialize";
import { isHtmlImage } from "../canvasPort";
import type {
  OptimizeBlockPayload,
  OptimizeBlockResult,
  RunNodesPayload,
} from "./protocol";
import type { QRBlock } from "@/domain/qr/codewords/blocks";

function expandNodeIds(ids: string[]): string[] {
  return ids.flatMap((id) =>
    id === "qartOptimize"
      ? ["qartSelectEditable", "qartBitPriority", "qartSolve"]
      : [id]
  );
}

async function yieldToUi(): Promise<void> {
  const sched = (
    globalThis as unknown as {
      scheduler?: { yield?: () => Promise<void> };
    }
  ).scheduler;
  if (typeof sched?.yield === "function") {
    await sched.yield();
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function prepareContext(
  ctx: GenerationContext
): Promise<GenerationContext> {
  const next = cloneContext(ctx);
  if (isHtmlImage(next.sourceImage)) {
    next.sourceImage = await bitmapFromHtmlImage(next.sourceImage);
  }
  return next;
}

async function runNodesJob(
  nodeIds: string[],
  ctx: GenerationContext,
  options: RunGraphOptions,
  signal?: AbortSignal,
  deferImageMetrics?: boolean
): Promise<GenerationContext> {
  if (nodeIds.length === 0) return ctx;
  if (signal?.aborted) {
    throw new JobCancelledError("Pipeline run was cancelled");
  }

  const pool = getWorkerPool();
  const prepared = await prepareContext(ctx);
  const payload: RunNodesPayload = {
    nodeIds,
    ctx: serializeContext(prepared),
    params: options.params,
    deferImageMetrics,
  };

  if (pool.isFallback) {
    await yieldToUi();
    const local = hydrateContext(payload.ctx);
    local.signal = signal;
    local.deferImageMetrics = deferImageMetrics;
    return runGraph(nodeIds, local, options);
  }

  const serialized = await pool.enqueue<ReturnType<typeof serializeContext>>({
    type: "runNodes",
    payload,
    signal,
  });
  const hydrated = hydrateContext(serialized);
  hydrated.signal = signal;
  return hydrated;
}

async function solveBlocksParallel(
  ctx: GenerationContext,
  signal?: AbortSignal
): Promise<GenerationContext> {
  const blocks = ctx.blocks ?? [];
  const bitOrders = ctx.bitOrders ?? [];
  const constraints = ctx.constraints;
  const selection = ctx.editableSelection;
  const versionInfo = ctx.versionInfo;
  if (!constraints || !selection || !versionInfo) {
    throw new PipelineError("qartSolve missing constraints/selection/versionInfo");
  }

  const ec = versionInfo.ecCodewordsPerBlock;
  const pool = getWorkerPool();
  const jobs: Promise<OptimizeBlockResult>[] = [];

  for (let i = 0; i < blocks.length; i++) {
    if (signal?.aborted) {
      throw new JobCancelledError("QArt generation was cancelled");
    }
    const bitOrder = bitOrders[i] ?? [];
    if (bitOrder.length === 0) continue;
    const payload: OptimizeBlockPayload = {
      blockIndex: i,
      block: blocks[i],
      bitOrder,
      valueGrid: constraints.valueGrid,
      dimension: constraints.dimension,
      ecCodewordsPerBlock: ec,
      editableIndices: Array.from(selection.editableCodewordIndices[i] ?? []),
    };
    jobs.push(
      pool.enqueue<OptimizeBlockResult>({
        type: "optimizeBlock",
        payload,
        signal,
      })
    );
  }

  const results = await Promise.all(jobs);
  const workingBlocks: QRBlock[] = blocks.map((b) => b);
  const controlledBits = new Map<string, boolean>();
  let totalBitsOptimized = 0;

  for (const result of results) {
    workingBlocks[result.blockIndex] = result.block;
    totalBitsOptimized += result.optimized;
    for (const [id, flag] of result.controlledBits) {
      controlledBits.set(id, flag);
    }
  }

  if (totalBitsOptimized === 0) {
    throw new Error(
      "QArt optimization completed but no bits were modified. This may indicate insufficient padding capacity or a bug in the optimization algorithm."
    );
  }

  verifyOptimizedBlocks(
    workingBlocks,
    ec,
    new ReedSolomonEncoder(ec)
  );

  return {
    ...ctx,
    blocks: workingBlocks,
    controlledBits,
  };
}

/**
 * Run a preset or node list, off-thread when workers are available.
 */
export async function runGraphOffthread(
  presetOrNodes: PresetId | string[],
  ctx: GenerationContext,
  options: RunGraphOptions = {}
): Promise<GenerationContext> {
  const rawIds = Array.isArray(presetOrNodes)
    ? [...presetOrNodes]
    : resolvePresetNodes(presetOrNodes);

  if (!Array.isArray(presetOrNodes)) {
    const preset = getPreset(presetOrNodes);
    if (!preset) {
      throw new PipelineError(`Unknown preset: ${presetOrNodes}`);
    }
  }

  const nodeIds = expandNodeIds(rawIds);
  const solveIdx = nodeIds.indexOf("qartSolve");
  const signal = ctx.signal;

  if (solveIdx === -1) {
    const out = await runNodesJob(nodeIds, ctx, options, signal, true);
    return fillDeferredImageMetrics(out, signal);
  }

  const prefix = nodeIds.slice(0, solveIdx);
  const suffix = nodeIds.slice(solveIdx + 1);

  let current = ctx;
  if (prefix.length > 0) {
    current = await runNodesJob(prefix, current, options, signal);
  }
  current = await solveBlocksParallel(current, signal);
  if (suffix.length > 0) {
    current = await runNodesJob(suffix, current, options, signal, true);
  }
  current = await fillDeferredImageMetrics(current, signal);
  return current;
}

async function fillDeferredImageMetrics(
  ctx: GenerationContext,
  signal?: AbortSignal
): Promise<GenerationContext> {
  const reference = ctx.targetImage ?? ctx.offscreenCanvasImage;
  const rendered = ctx.fusedImage;
  if (!reference || !rendered) return ctx;
  if (signal?.aborted) return ctx;

  try {
    const pool = getWorkerPool();
    let ref = reference;
    if (ref.width !== rendered.width || ref.height !== rendered.height) {
      ref = resizeImageDataNearest(ref, rendered.width);
    }
    const metrics = await pool.enqueue<
      import("@/domain/evaluate").ImageQualityMetrics
    >({
      type: "imageMetrics",
      payload: {
        reference: {
          data: ref.data,
          width: ref.width,
          height: ref.height,
        },
        rendered: {
          data: rendered.data,
          width: rendered.width,
          height: rendered.height,
        },
      },
      signal,
    });
    const evaluation = ctx.evaluation
      ? { ...ctx.evaluation, image: metrics }
      : ctx.evaluation;
    return { ...ctx, metrics, evaluation };
  } catch (err) {
    if (err instanceof JobCancelledError) throw err;
    try {
      const metrics = computeIsqrMetrics(reference, rendered);
      const evaluation = ctx.evaluation
        ? { ...ctx.evaluation, image: metrics }
        : ctx.evaluation;
      return { ...ctx, metrics, evaluation };
    } catch {
      return ctx;
    }
  }
}

export { serializeMatrixForWorker };
