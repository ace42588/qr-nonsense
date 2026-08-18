/**
 * Golden-parity pins for the qartOptimize decomposition.
 *
 * The other qart suites assert ranges (error in [0,1], decode rate >= 0.8),
 * not exact values. These tests pin exact controlledBits / visualError /
 * final-matrix values for deterministic fixtures so the qartSelectEditable
 * / qartBitPriority / qartSolve split stays bit-for-bit equivalent.
 *
 * Provenance of the pinned values: the totalBitsOptimized counts and the
 * visualError values were captured from the pre-split monolithic
 * optimizeQArtBlocks. The module/matrix digests are position-based (bit
 * ids are crypto.randomUUID() and differ per process) and were captured
 * from the split implementation after verifying, in-process, that the
 * split produces a controlledBits map identical per bit id to a verbatim
 * copy of the pre-split monolith on these exact fixtures.
 */

import { describe, it, expect } from "vitest";
import {
  optimizeQArtBlocks,
  rebuildFromBlocks,
  finalizeQArtMatrix,
  deepCopyBlock,
  type OptimizeQArtBlocksResult,
} from "../stages";
import type { PriorityFunctionType } from "../bitPriority";
import { getEncodedMessage } from "../../qr";
import { generateCodewords } from "../../qr/codewords";
import { getMatrix } from "../../qr/matrix";
import { getVersionInfo } from "../../qr/versionUtils";
import { computeContrastGrid } from "../../image";
import type { QRMatrix } from "../../shared/types";
import type { Input } from "@/app/types";
import {
  NODE_CATALOG,
  runGraph,
  constraintsFromImageGrids,
  type GenerationContext,
} from "@/domain/pipeline";
import { extractBytesFromBlock } from "./utils";

/** Deterministic pseudo-random grid (LCG, platform-independent). */
function lcgGrid(dimension: number, seed: number): Float32Array {
  const g = new Float32Array(dimension * dimension);
  let s = seed >>> 0;
  for (let i = 0; i < g.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    g[i] = s / 0x100000000;
  }
  return g;
}

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Digest of controlledBits keyed by module position instead of bit id —
 * bit ids are crypto.randomUUID() values and differ between processes, so
 * they cannot appear in a golden value. Module (x, y) positions of the
 * controllable bits are deterministic for a fixed fixture.
 */
function digestControlledModules(
  controlledBits: Map<string, boolean>,
  matrix: QRMatrix,
  dimension: number
): string {
  const entries: string[] = [];
  for (const [bitId, v] of controlledBits) {
    const module = matrix.getModuleByBitId?.(bitId);
    expect(module).toBeDefined();
    entries.push(`${module!.y * dimension + module!.x}=${v ? 1 : 0}`);
  }
  return fnv1a(entries.sort().join("\n"));
}

/** Digest of the final matrix darkness pattern. */
function digestMatrix(matrix: QRMatrix): string {
  const rows = matrix.map((row) =>
    row.map((m) => (m?.isDark ? "1" : "0")).join("")
  );
  return fnv1a(rows.join("\n"));
}

function summarize(
  result: OptimizeQArtBlocksResult,
  matrix: QRMatrix,
  dimension: number
) {
  let controlled = 0;
  for (const v of result.controlledBits.values()) if (v) controlled++;
  return {
    totalBitsOptimized: result.totalBitsOptimized,
    bits: result.controlledBits.size,
    controlled,
    digest: digestControlledModules(result.controlledBits, matrix, dimension),
  };
}

function buildFixture() {
  const input: Input = {
    id: "parity-input",
    type: "string",
    mode: "byte",
    data: "A",
  };
  const encoded = getEncodedMessage([input], -1, 0);
  const versionInfo = getVersionInfo(0, encoded.version);
  const codewordsResult = generateCodewords(
    encoded.segments,
    encoded.version,
    0
  );
  const { matrix } = getMatrix(
    codewordsResult.codewords,
    0,
    encoded.version,
    0
  );
  const dimension = encoded.version * 4 + 17;
  const targetGrid = lcgGrid(dimension, 12345);
  const contrastGrid = computeContrastGrid(targetGrid, dimension, 5);
  return {
    segments: encoded.segments,
    blocks: codewordsResult.blocks,
    matrix,
    versionInfo,
    dimension,
    targetGrid,
    contrastGrid,
  };
}

function runOptimize(
  fx: ReturnType<typeof buildFixture>,
  priorityFunction: PriorityFunctionType,
  roiGrid?: Float32Array
) {
  const workingBlocks = fx.blocks.map(deepCopyBlock);
  const result = optimizeQArtBlocks({
    segments: fx.segments,
    workingBlocks,
    matrixForBitLookup: fx.matrix,
    targetGrid: fx.targetGrid,
    contrastGrid: fx.contrastGrid,
    dimension: fx.dimension,
    ecCodewordsPerBlock: fx.versionInfo.ecCodewordsPerBlock,
    priorityFunction,
    roiGrid,
  });
  const rebuilt = rebuildFromBlocks({
    segments: fx.segments,
    workingBlocks: result.workingBlocks,
    ecCodewordsPerBlock: fx.versionInfo.ecCodewordsPerBlock,
  });
  const finalized = finalizeQArtMatrix({
    finalCodewords: rebuilt.finalCodewords,
    version: fx.versionInfo.version,
    errorCorrectionLevel: 0,
    maskIndex: 0,
    targetGrid: fx.targetGrid,
    dimension: fx.dimension,
    controlledBits: result.controlledBits,
  });
  return { result, finalized };
}

describe("QArt golden parity", () => {
  it("pins controlledBits and visualError for the contrast priority path", () => {
    const fx = buildFixture();
    const { result, finalized } = runOptimize(fx, "contrast");

    expect(summarize(result, fx.matrix, fx.dimension)).toMatchInlineSnapshot(`
      {
        "bits": 200,
        "controlled": 150,
        "digest": "d9d1c302",
        "totalBitsOptimized": 150,
      }
    `);
    expect(finalized.error).toMatchInlineSnapshot(`0.3289194339696013`);
    expect(digestMatrix(finalized.matrix)).toMatchInlineSnapshot(`"68a2bc99"`);
  });

  it("pins controlledBits and visualError for the roi priority path", () => {
    const fx = buildFixture();
    const roiGrid = lcgGrid(fx.dimension, 99991);
    const { result, finalized } = runOptimize(fx, "roi", roiGrid);

    expect(summarize(result, fx.matrix, fx.dimension)).toMatchInlineSnapshot(`
      {
        "bits": 200,
        "controlled": 161,
        "digest": "3e7b5357",
        "totalBitsOptimized": 161,
      }
    `);
    expect(finalized.error).toMatchInlineSnapshot(`0.3435046041122405`);
    expect(digestMatrix(finalized.matrix)).toMatchInlineSnapshot(`"6875036d"`);
  });

  it("facade qartOptimize node matches the split nodes run in sequence", async () => {
    const fx = buildFixture();
    const constraints = constraintsFromImageGrids(
      fx.targetGrid,
      fx.contrastGrid,
      undefined,
      fx.dimension
    );
    const baseCtx: GenerationContext = {
      segments: fx.segments,
      matrix: fx.matrix,
      version: fx.versionInfo.version,
      versionInfo: fx.versionInfo,
      errorCorrectionLevel: 0,
      targetGrid: fx.targetGrid,
      contrastGrid: fx.contrastGrid,
      priorityFunction: "contrast",
    };

    const facadeCtx = await NODE_CATALOG.qartOptimize.run({
      ...baseCtx,
      blocks: fx.blocks.map(deepCopyBlock),
    });

    const splitCtx = await runGraph(
      ["qartSelectEditable", "qartBitPriority", "qartSolve"],
      { ...baseCtx, blocks: fx.blocks.map(deepCopyBlock), constraints }
    );

    // Bit ids are shared across the deep copies, so control decisions can
    // be compared per bit id; block bytes pin the solved payloads.
    expect(splitCtx.controlledBits).toEqual(facadeCtx.controlledBits);
    expect(splitCtx.blocks!.map(extractBytesFromBlock)).toEqual(
      facadeCtx.blocks!.map(extractBytesFromBlock)
    );
  });
});
