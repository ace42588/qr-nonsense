/**
 * Pipeline node catalog — wraps existing domain stage functions.
 */

import { parseAll } from "@/domain/input";
import {
  encodeSegments,
  buildCodewords,
  buildMatrix,
} from "@/domain/qr/stages";
import { getVersionInfo } from "@/domain/qr/versionUtils";
import { encodePair } from "@/domain/dual";
import { countAgreement } from "@/domain/ambiguous";
import {
  fuseEmbedPairWithCsf,
} from "@/domain/embed/fusion";
import {
  appendQArtData,
  prepareImageGrids,
  optimizeQArtBlocks,
  rebuildFromBlocks,
  finalizeQArtMatrix,
  extractOptimizedAppendData,
} from "@/domain/qart/stages";
import { createBrowserEvaluateDecodePort } from "@/adapters/browser/validation";
import { evaluateGeneratedQr } from "@/domain/evaluate";
import { applyVisualDamage } from "@/domain/qr/corruption/applyDamage";
import {
  computeRoi,
  computeModuleBinaryTarget,
  fuseIsqrColor,
  applyIsqrDwtCsf,
} from "@/domain/isqr/stages";
import { withMatrix, withBlocks, attachMatrixLookup } from "./context";
import type { GenerationContext, PipelineNode, NodeParams } from "./types";

function requireFormat(ctx: GenerationContext): {
  version: number;
  errorCorrectionLevel: number;
  dataMask: number | null;
} {
  const errorCorrectionLevel = ctx.errorCorrectionLevel ?? 0;
  const version =
    ctx.versionInfo?.version ??
    (typeof ctx.version === "number" ? ctx.version : 1);
  const dataMask =
    ctx.dataMask === undefined ? -1 : (ctx.dataMask as number | null);
  return { version, errorCorrectionLevel, dataMask };
}

export const NODE_CATALOG: Record<string, PipelineNode> = {
  parseInputs: {
    id: "parseInputs",
    stage: "payload",
    in: ["Inputs"],
    out: ["Inputs"],
    run(ctx) {
      if (!ctx.inputs) return ctx;
      const parsed = parseAll(ctx.inputs);
      const inputs = ctx.inputs.map((inp) => parsed[inp.id] ?? inp);
      return { ...ctx, inputs };
    },
  },

  encode: {
    id: "encode",
    stage: "encode",
    in: ["Inputs", "Format"],
    out: ["Segments", "Format"],
    run(ctx) {
      const { version, errorCorrectionLevel } = requireFormat(ctx);
      const result = encodeSegments(
        ctx.inputs!,
        version === -1 ? -1 : version,
        errorCorrectionLevel
      );
      return {
        ...ctx,
        segments: result.segments,
        version: result.version,
        versionInfo: result.versionInfo,
        encodeError: result.error,
        invalidQR: result.invalid,
        invalidQRReason: result.invalidReason,
      };
    },
  },

  codewords: {
    id: "codewords",
    stage: "codewords",
    in: ["Segments", "Format"],
    out: ["Codewords", "Blocks", "Segments"],
    run(ctx) {
      const { errorCorrectionLevel } = requireFormat(ctx);
      const version = ctx.versionInfo?.version ?? ctx.version!;
      const result = buildCodewords(
        ctx.segments!,
        version,
        errorCorrectionLevel
      );
      return withBlocks(
        { ...ctx, segments: result.segments },
        result.blocks,
        result.codewords
      );
    },
  },

  matrix: {
    id: "matrix",
    stage: "matrix",
    in: ["Codewords", "Format"],
    out: ["Matrix", "Format"],
    run(ctx) {
      const { errorCorrectionLevel, dataMask } = requireFormat(ctx);
      const version = ctx.versionInfo?.version ?? ctx.version!;
      const result = buildMatrix(
        ctx.codewords!,
        dataMask,
        version,
        errorCorrectionLevel
      );
      return withMatrix(
        { ...ctx, dataMask: result.dataMask },
        result.matrix
      );
    },
  },

  encodePair: {
    id: "encodePair",
    stage: "encode",
    in: ["Inputs", "InputsB", "Format"],
    out: ["Matrix", "MatrixA", "MatrixB", "Format"],
    run(ctx) {
      const { version, errorCorrectionLevel, dataMask } = requireFormat(ctx);
      const pair = encodePair({
        inputsA: ctx.inputs!,
        inputsB: ctx.inputsB!,
        version,
        errorCorrectionLevel,
        dataMask,
      });
      return {
        ...ctx,
        matrixA: pair.matrixA ? attachMatrixLookup(pair.matrixA) : null,
        matrixB: pair.matrixB ? attachMatrixLookup(pair.matrixB) : null,
        version: pair.version,
        dataMask: pair.dataMask,
        errorA: pair.errorA,
        errorB: pair.errorB,
        invalidA: pair.invalidA,
        invalidB: pair.invalidB,
        invalidReasonA: pair.invalidReasonA,
        invalidReasonB: pair.invalidReasonB,
        // Primary matrix defaults to A for shared viewers
        matrix: pair.matrixA ? attachMatrixLookup(pair.matrixA) : null,
      };
    },
  },

  qartAppend: {
    id: "qartAppend",
    stage: "encode",
    in: ["Segments", "Blocks", "Matrix", "Format"],
    out: ["Segments", "Codewords", "Blocks", "Matrix"],
    run(ctx) {
      const versionInfo =
        ctx.versionInfo ??
        getVersionInfo(ctx.errorCorrectionLevel ?? 0, ctx.version ?? 1);
      const result = appendQArtData({
        segments: ctx.segments!,
        codewords: ctx.codewords!,
        blocks: ctx.blocks!,
        initialMatrix: ctx.matrix!,
        versionInfo,
        errorCorrectionLevel: ctx.errorCorrectionLevel ?? 0,
        appendData: ctx.appendData,
        maskIndex: 0,
      });
      return withMatrix(
        withBlocks(
          { ...ctx, segments: result.segments, versionInfo },
          result.blocks,
          result.codewords
        ),
        result.matrix
      );
    },
  },

  rasterize: {
    id: "rasterize",
    stage: "raster",
    in: ["Image", "Matrix"],
    out: ["Grid", "Image"],
    async run(ctx) {
      const version =
        ctx.versionInfo?.version ??
        ctx.version ??
        (ctx.matrix ? (ctx.matrix.length - 17) / 4 : 1);
      const targetImage =
        ctx.targetImage ||
        ctx.offscreenCanvasImage ||
        ({
          width: 8,
          height: 8,
          data: new Uint8ClampedArray(8 * 8 * 4).fill(255),
        } as ImageData);

      const grids = await prepareImageGrids({
        version: Math.max(1, Math.round(version)),
        targetImage,
        sourceImage: ctx.sourceImage ?? undefined,
        transformParams: ctx.transformParams ?? undefined,
        targetGridOverride: ctx.targetGrid,
      });

      return {
        ...ctx,
        offscreenCanvasImage: grids.normalizedTargetImage,
        targetGrid: grids.targetGrid,
        contrastGrid: grids.contrastGrid,
        targetImage: grids.normalizedTargetImage,
      };
    },
  },

  qartOptimize: {
    id: "qartOptimize",
    stage: "optimize",
    in: ["Segments", "Blocks", "Matrix", "Grid"],
    out: ["Blocks"],
    run(ctx) {
      const versionInfo =
        ctx.versionInfo ??
        getVersionInfo(ctx.errorCorrectionLevel ?? 0, ctx.version ?? 1);
      const dimension = versionInfo.version * 4 + 17;
      const result = optimizeQArtBlocks({
        segments: ctx.segments!,
        workingBlocks: ctx.blocks!,
        matrixForBitLookup: ctx.matrix!,
        targetGrid: ctx.targetGrid!,
        contrastGrid: ctx.contrastGrid ?? ctx.targetGrid!,
        dimension,
        ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
        priorityFunction: ctx.priorityFunction,
        roiGrid: ctx.roiGrid,
        signal: ctx.signal,
      });
      return {
        ...ctx,
        blocks: result.workingBlocks,
        controlledBits: result.controlledBits,
      };
    },
  },

  qartRebuild: {
    id: "qartRebuild",
    stage: "optimize",
    in: ["Blocks", "Segments", "Format"],
    out: ["Codewords", "Segments", "Matrix"],
    run(ctx) {
      const versionInfo =
        ctx.versionInfo ??
        getVersionInfo(ctx.errorCorrectionLevel ?? 0, ctx.version ?? 1);
      const rebuilt = rebuildFromBlocks({
        segments: ctx.segments!,
        workingBlocks: ctx.blocks!,
        appendData: ctx.appendData,
        ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      });
      const finalized = finalizeQArtMatrix({
        finalCodewords: rebuilt.finalCodewords,
        version: versionInfo.version,
        errorCorrectionLevel: ctx.errorCorrectionLevel ?? 0,
        maskIndex: 0,
        targetGrid: ctx.targetGrid ?? new Float32Array(dimensionSize(versionInfo.version)),
        dimension: versionInfo.version * 4 + 17,
        controlledBits: ctx.controlledBits ?? new Map(),
      });
      const optimizedAppendData = extractOptimizedAppendData(
        ctx.segments!,
        rebuilt.updatedSegments,
        ctx.appendData
      );
      return withMatrix(
        withBlocks(
          {
            ...ctx,
            segments: rebuilt.updatedSegments,
            codewords: rebuilt.finalCodewords,
            controlMatrix: finalized.controlMatrix,
            visualError: finalized.error,
            dataMask: finalized.dataMask,
            optimizedAppendData,
          },
          rebuilt.workingBlocks,
          rebuilt.finalCodewords
        ),
        finalized.matrix
      );
    },
  },

  evaluate: {
    id: "evaluate",
    stage: "verify",
    in: ["Matrix"],
    out: ["Report"],
    async run(ctx) {
      const trials =
        Number.isFinite(ctx.decodeTrials) && (ctx.decodeTrials as number) > 0
          ? (ctx.decodeTrials as number)
          : 1;
      const evaluation = await evaluateGeneratedQr(
        {
          matrix: ctx.matrix!,
          version: ctx.versionInfo?.version ?? ctx.version,
          errorCorrectionLevel: ctx.errorCorrectionLevel,
          dataMask:
            typeof ctx.dataMask === "number" ? ctx.dataMask : null,
          versionInfo: ctx.versionInfo,
          blocks: ctx.blocks,
          targetGrid: ctx.targetGrid,
          contrastGrid: ctx.contrastGrid,
          roiGrid: ctx.roiGrid,
          controlledBits: ctx.controlledBits,
          referenceImage: ctx.targetImage ?? ctx.offscreenCanvasImage,
          renderedImage: ctx.fusedImage,
          matrixA: ctx.matrixA,
          matrixB: ctx.matrixB,
          decodeTrials: trials,
          minDecodeRedundancy: ctx.minDecodeRedundancy,
        },
        { decode: createBrowserEvaluateDecodePort() }
      );

      const primaryScan = evaluation.scannability?.[0];
      return {
        ...ctx,
        evaluation,
        decodeSuccessRate: primaryScan?.successRate,
        metrics: evaluation.image,
        visualError: evaluation.visual?.meanAbsoluteError ?? ctx.visualError,
        scannabilityWarning: evaluation.scannabilityWarning ?? null,
      };
    },
  },

  /** @deprecated Use `evaluate` — kept as alias for transitional graphs */
  validateDecode: {
    id: "validateDecode",
    stage: "verify",
    in: ["Matrix"],
    out: ["Report"],
    async run(ctx, params) {
      return NODE_CATALOG.evaluate.run(ctx, params);
    },
  },

  /** @deprecated Use `evaluate` — kept as alias for transitional graphs */
  metrics: {
    id: "metrics",
    stage: "verify",
    in: ["Image", "Render"],
    out: ["Report"],
    async run(ctx, params) {
      return NODE_CATALOG.evaluate.run(ctx, params);
    },
  },

  halftone: {
    id: "halftone",
    stage: "raster",
    in: ["Matrix", "Image"],
    out: ["Render"],
    run(ctx) {
      return { ...ctx, renderIntent: "halftone" };
    },
  },

  isqrRoi: {
    id: "isqrRoi",
    stage: "optimize",
    in: ["Image", "Format"],
    out: ["Grid"],
    run(ctx) {
      const version = ctx.versionInfo?.version ?? ctx.version ?? 1;
      const dimension = version * 4 + 17;
      const transformedImage =
        ctx.targetImage ||
        ctx.offscreenCanvasImage ||
        ({
          width: dimension,
          height: dimension,
          data: new Uint8ClampedArray(dimension * dimension * 4).fill(128),
        } as ImageData);
      const { roiMeta, roiGrid } = computeRoi({
        transformedImage,
        dimension,
        maskImage: ctx.maskImage,
        roiThresholdBias: ctx.roiThresholdBias,
      });
      const binaryTarget = computeModuleBinaryTarget(
        transformedImage,
        dimension
      );
      return {
        ...ctx,
        roiMeta,
        roiGrid,
        targetGrid: binaryTarget,
        priorityFunction: "roi",
        targetImage: transformedImage,
      };
    },
  },

  isqrFuse: {
    id: "isqrFuse",
    stage: "raster",
    in: ["Matrix", "Image", "Grid"],
    out: ["Render"],
    run(ctx) {
      const source =
        ctx.offscreenCanvasImage ||
        ctx.targetImage ||
        ({ width: 1, height: 1, data: new Uint8ClampedArray(4) } as ImageData);
      const fused = fuseIsqrColor({
        matrix: ctx.matrix!,
        sourceImage: source,
        roiGrid: ctx.roiGrid!,
        modulePixel: ctx.modulePixel,
        qrBlend: ctx.qrBlend,
      });
      return {
        ...ctx,
        fusedImage: fused,
        renderIntent: "isqr",
      };
    },
  },

  dwtCsf: {
    id: "dwtCsf",
    stage: "raster",
    in: ["Render"],
    out: ["Render"],
    run(ctx) {
      if (!ctx.fusedImage) return ctx;
      return {
        ...ctx,
        fusedImage: applyIsqrDwtCsf(ctx.fusedImage, ctx.csf),
      };
    },
  },

  ambiguousRender: {
    id: "ambiguousRender",
    stage: "raster",
    in: ["MatrixA", "MatrixB"],
    out: ["Render"],
    run(ctx) {
      const stats =
        ctx.matrixA && ctx.matrixB
          ? countAgreement(ctx.matrixA, ctx.matrixB)
          : { agreeCount: 0, disagreeCount: 0, totalModules: 0 };
      return {
        ...ctx,
        ambiguousStats: stats,
        renderIntent: "ambiguous",
      };
    },
  },

  embedFuse: {
    id: "embedFuse",
    stage: "raster",
    in: ["MatrixA", "MatrixB"],
    out: ["Render"],
    run(ctx) {
      if (!ctx.matrixA || !ctx.matrixB) {
        return { ...ctx, fusedImage: null, renderIntent: "embed" };
      }
      const fusedImage = fuseEmbedPairWithCsf(ctx.matrixA, ctx.matrixB, {
        modulePixel: ctx.modulePixel ?? 9,
        centerSeed: ctx.centerSeed ?? 0.35,
        polarityStrength: ctx.polarityStrength ?? 0.9,
        csf: ctx.csf,
      });
      return {
        ...ctx,
        fusedImage,
        renderIntent: "embed",
        modulePixel: ctx.modulePixel ?? 9,
        centerSeed: ctx.centerSeed ?? 0.35,
      };
    },
  },

  applyDamage: {
    id: "applyDamage",
    stage: "mutate",
    in: ["Matrix", "Damage"],
    out: ["Matrix"],
    run(ctx) {
      const damaged = applyVisualDamage(
        ctx.matrix!,
        ctx.damagedModuleIds ?? []
      );
      return withMatrix(ctx, damaged);
    },
  },
};

function dimensionSize(version: number): number {
  const d = version * 4 + 17;
  return d * d;
}

export function getNode(id: string): PipelineNode | undefined {
  return NODE_CATALOG[id];
}

export function listNodeIds(): string[] {
  return Object.keys(NODE_CATALOG);
}

/** Merge caller params into context before a run. */
export function applyNodeParams(
  ctx: GenerationContext,
  params?: NodeParams
): GenerationContext {
  if (!params) return ctx;
  return { ...ctx, ...params } as GenerationContext;
}
