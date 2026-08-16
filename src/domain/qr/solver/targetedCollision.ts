/**
 * Multi-phase targeted collision search (format → char seeds → block RS
 * sphere → priority data sample → uniform fallback). Designed to run inside
 * Vite workers with workerIndex/workerCount sharding.
 */

import { QRMatrix } from "@/domain/shared/types";
import {
  applyVisualDamage,
  eligibleFormatMetaModules,
  eligibleDataEcModules,
  eligibleTieredDataModules,
} from "@/domain/qr/corruption";
import {
  findBruteForceCollision,
  combinationsCount,
  unrankCombination,
  shardRankCount,
  trialBudgetForWorker,
  type CollisionDecodeFn,
  type BruteForceCollisionProgress,
  type BruteForceCollisionResult,
  type CollisionSearchPhase,
} from "./bruteForceCollision";
import {
  classifyRsPrefilter,
  type SerializedRsBlock,
} from "./rsPrefilter";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { getBlockBitIds } from "@/domain/qr/reedsolomon/applyFlips";

const DEFAULT_MAX_FLIPS = 20;
const DEFAULT_MAX_TRIALS = 3000;
const DEFAULT_MAX_EXHAUSTIVE = 5000;
const FORMAT_BUDGET_FRACTION = 0.15;

export interface TargetedCollisionOptions {
  matrix: QRMatrix;
  originalPayload: string;
  decode: CollisionDecodeFn;
  /** Live QR blocks (main-thread) or omit when using serializedBlocks. */
  blocks?: QRBlock[];
  /** Worker-safe block snapshots for RS prefilter / block sphere. */
  serializedBlocks?: SerializedRsBlock[];
  segmentTypesBySourceId?: Record<string, string>;
  /** Precomputed character-change flip sets (module ids). */
  charSeedFlipSets?: string[][];
  ecCodewordsPerBlock: number;
  maxFlips?: number;
  maxTrials?: number;
  maxExhaustive?: number;
  seed?: number;
  workerIndex?: number;
  workerCount?: number;
  signal?: AbortSignal;
  onProgress?: (
    progress: BruteForceCollisionProgress
  ) => void | Promise<void>;
}

function createLcg(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 0x100000000;
  };
}

function sampleKSubset(
  eligible: string[],
  k: number,
  rand: () => number
): string[] {
  const n = eligible.length;
  const picks = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.slice(0, k).map((i) => eligible[i]);
}

function collectEcBitIds(
  blocks: QRBlock[] | undefined,
  serialized: SerializedRsBlock[] | undefined
): Set<string> {
  const ids = new Set<string>();
  if (serialized?.length) {
    for (const b of serialized) {
      const dataBits = b.dataBytes.length * 8;
      for (let i = dataBits; i < b.bitIds.length; i++) {
        if (b.bitIds[i]) ids.add(b.bitIds[i]);
      }
    }
    return ids;
  }
  if (blocks?.length) {
    for (const block of blocks) {
      for (const cw of block.errorCorrection) {
        for (const bit of cw.bits) ids.add(bit.id);
      }
    }
  }
  return ids;
}

function bitIdsToModuleIds(matrix: QRMatrix, bitIds: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const bitId of bitIds) {
    const mod = matrix.getModuleByBitId?.(bitId);
    if (!mod?.id || seen.has(mod.id)) continue;
    seen.add(mod.id);
    out.push(mod.id);
  }
  return out;
}

function blockModuleIds(
  matrix: QRMatrix,
  blocks: QRBlock[] | undefined,
  serialized: SerializedRsBlock[] | undefined,
  blockIndex: number
): string[] {
  if (serialized?.[blockIndex]) {
    return bitIdsToModuleIds(matrix, serialized[blockIndex].bitIds);
  }
  if (blocks?.[blockIndex]) {
    return bitIdsToModuleIds(matrix, getBlockBitIds(blocks[blockIndex]));
  }
  return [];
}

function candidateTouchesFormat(
  formatIds: Set<string>,
  flipModuleIds: string[]
): boolean {
  return flipModuleIds.some((id) => formatIds.has(id));
}

function moduleIdsToBitIds(
  matrix: QRMatrix,
  flipModuleIds: string[],
  byId: Map<string, { bitId?: string; bit?: { id?: string } }>
): string[] {
  const flippedBitIds: string[] = [];
  for (const mid of flipModuleIds) {
    const m = byId.get(mid);
    const bitId = m?.bit?.id || m?.bitId;
    if (bitId) flippedBitIds.push(bitId);
  }
  // Fallback scan if map miss (should be rare)
  if (flippedBitIds.length < flipModuleIds.length) {
    for (const mid of flipModuleIds) {
      if (!byId.has(mid)) {
        for (let y = 0; y < matrix.length; y++) {
          for (let x = 0; x < matrix.length; x++) {
            const m = matrix[y]?.[x];
            if (m?.id === mid) {
              const bitId = m.bit?.id || m.bitId;
              if (bitId) flippedBitIds.push(bitId);
            }
          }
        }
      }
    }
  }
  return flippedBitIds;
}

async function decodeIfCollision(
  matrix: QRMatrix,
  flipModuleIds: string[],
  originalPayload: string,
  decode: CollisionDecodeFn
): Promise<string | null> {
  const damaged = applyVisualDamage(matrix, flipModuleIds);
  const decoded = await decode(damaged);
  if (decoded == null || decoded === "") return null;
  if (decoded === originalPayload) return null;
  return decoded;
}

/**
 * Evaluate one flip candidate: count 1 trial; RS-prefilter data/EC sets;
 * jsQR when needed. Returns collision payload or null.
 */
async function evaluateCandidate(
  matrix: QRMatrix,
  flipModuleIds: string[],
  originalPayload: string,
  decode: CollisionDecodeFn,
  rsBlocks: QRBlock[] | SerializedRsBlock[] | undefined,
  twoS: number,
  formatIds: Set<string>,
  moduleById: Map<string, { bitId?: string; bit?: { id?: string } }>
): Promise<string | null> {
  if (!flipModuleIds.length) return null;

  const needsJsQrAlways = candidateTouchesFormat(formatIds, flipModuleIds);
  if (!needsJsQrAlways && rsBlocks?.length && twoS > 0) {
    const flippedBitIds = moduleIdsToBitIds(
      matrix,
      flipModuleIds,
      moduleById
    );
    const outcome = classifyRsPrefilter(rsBlocks, flippedBitIds, twoS);
    if (outcome !== "miscorrected") return null;
  }

  return decodeIfCollision(matrix, flipModuleIds, originalPayload, decode);
}

function leaveOneOutSets(seed: string[]): string[][] {
  if (seed.length <= 1) return [];
  const out: string[][] = [];
  for (let i = 0; i < seed.length; i++) {
    out.push(seed.filter((_, j) => j !== i));
  }
  return out;
}

/**
 * Multi-phase targeted collision search with worker sharding.
 */
export async function findTargetedCollision(
  options: TargetedCollisionOptions
): Promise<BruteForceCollisionResult | null> {
  const {
    matrix,
    originalPayload,
    decode,
    blocks,
    serializedBlocks,
    segmentTypesBySourceId,
    charSeedFlipSets = [],
    ecCodewordsPerBlock,
    maxFlips = DEFAULT_MAX_FLIPS,
    maxTrials = DEFAULT_MAX_TRIALS,
    maxExhaustive = DEFAULT_MAX_EXHAUSTIVE,
    seed = 1,
    workerIndex = 0,
    workerCount = 1,
    signal,
    onProgress,
  } = options;

  const wCount = Math.max(1, Math.floor(workerCount));
  const wIndex = Math.max(0, Math.floor(workerIndex));
  if (wIndex >= wCount) return null;

  const localMax = trialBudgetForWorker(maxTrials, wIndex, wCount);
  if (!matrix?.length || maxFlips < 1 || localMax < 1) return null;
  if (signal?.aborted) return null;

  const twoS = ecCodewordsPerBlock;
  const t = Math.floor(twoS / 2);
  const rsBlocks: QRBlock[] | SerializedRsBlock[] | undefined =
    serializedBlocks?.length ? serializedBlocks : blocks;

  const formatIds = new Set(eligibleFormatMetaModules(matrix));
  const moduleById = new Map<
    string,
    { bitId?: string; bit?: { id?: string } }
  >();
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      const m = matrix[y]?.[x];
      if (m?.id) moduleById.set(m.id, m);
    }
  }

  let trialsUsed = 0;
  let phase: CollisionSearchPhase = "format";
  let currentK = 1;

  const report = async (
    mode: "exhaustive" | "sample",
    eligibleCount: number
  ) => {
    await onProgress?.({
      trialsUsed,
      maxTrials: localMax,
      k: currentK,
      maxFlips,
      mode,
      eligibleCount,
      workerIndex: wIndex,
      workerCount: wCount,
      phase,
    });
  };

  const trySet = async (
    flipModuleIds: string[],
    mode: "exhaustive" | "sample",
    eligibleCount: number
  ): Promise<BruteForceCollisionResult | null> => {
    if (signal?.aborted) return null;
    if (trialsUsed >= localMax) return null;
    if (flipModuleIds.length < 1 || flipModuleIds.length > maxFlips) {
      return null;
    }

    trialsUsed += 1;
    currentK = flipModuleIds.length;
    await report(mode, eligibleCount);

    const decoded = await evaluateCandidate(
      matrix,
      flipModuleIds,
      originalPayload,
      decode,
      rsBlocks,
      twoS,
      formatIds,
      moduleById
    );
    if (decoded != null) {
      return {
        flipModuleIds,
        flipCount: flipModuleIds.length,
        decodedPayload: decoded,
        trialsUsed,
      };
    }
    return null;
  };

  // ——— Phase A: format / version ———
  phase = "format";
  const formatEligible = eligibleFormatMetaModules(matrix);
  const formatBudget = Math.max(
    1,
    Math.min(localMax, Math.ceil(localMax * FORMAT_BUDGET_FRACTION))
  );
  const formatKMax = Math.min(3, maxFlips, formatEligible.length);
  await report("exhaustive", formatEligible.length);

  for (let k = 1; k <= formatKMax && trialsUsed < formatBudget; k++) {
    if (signal?.aborted) return null;
    currentK = k;
    const n = formatEligible.length;
    const totalCombos = combinationsCount(n, k);
    if (!Number.isFinite(totalCombos) || totalCombos <= 0) continue;

    for (let rank = wIndex; rank < totalCombos; rank += wCount) {
      if (signal?.aborted) return null;
      if (trialsUsed >= formatBudget || trialsUsed >= localMax) break;
      const indices = unrankCombination(n, k, rank);
      const flipModuleIds = indices.map((i) => formatEligible[i]);
      const hit = await trySet(flipModuleIds, "exhaustive", n);
      if (hit) return hit;
    }
  }

  // ——— Phase B: character-change seeds ———
  phase = "charSeed";
  await report("exhaustive", charSeedFlipSets.length);
  for (let i = 0; i < charSeedFlipSets.length; i++) {
    if (i % wCount !== wIndex) continue;
    if (signal?.aborted) return null;
    if (trialsUsed >= localMax) break;

    const seedSet = charSeedFlipSets[i];
    if (!seedSet?.length) continue;

    const variants = [seedSet, ...leaveOneOutSets(seedSet)];
    for (const flipModuleIds of variants) {
      const hit = await trySet(
        flipModuleIds,
        "exhaustive",
        charSeedFlipSets.length
      );
      if (hit) return hit;
      if (trialsUsed >= localMax) break;
    }
  }

  // ——— Phase C: per-block RS sphere ———
  phase = "blockSphere";
  const blockCount =
    serializedBlocks?.length ?? blocks?.length ?? 0;
  await report("exhaustive", blockCount);

  for (let bi = 0; bi < blockCount; bi++) {
    if (signal?.aborted) return null;
    if (trialsUsed >= localMax) break;

    const eligible = blockModuleIds(matrix, blocks, serializedBlocks, bi);
    const n = eligible.length;
    if (n < 1) continue;

    const kMin = Math.min(n, t + 1);
    const kMax = Math.min(n, maxFlips, Math.max(kMin, 2 * t));
    if (kMin > kMax || kMin < 1) continue;

    for (let k = kMin; k <= kMax; k++) {
      if (signal?.aborted) return null;
      if (trialsUsed >= localMax) break;
      currentK = k;

      const totalCombos = combinationsCount(n, k);
      const useExhaustive =
        Number.isFinite(totalCombos) && totalCombos <= maxExhaustive;

      if (useExhaustive) {
        for (let rank = wIndex; rank < totalCombos; rank += wCount) {
          if (signal?.aborted) return null;
          if (trialsUsed >= localMax) break;
          const indices = unrankCombination(n, k, rank);
          const flipModuleIds = indices.map((i) => eligible[i]);
          const hit = await trySet(flipModuleIds, "exhaustive", n);
          if (hit) return hit;
        }
      } else if (Number.isFinite(totalCombos) && totalCombos > 0) {
        const myCount = shardRankCount(totalCombos, wIndex, wCount);
        const remaining = localMax - trialsUsed;
        const samplesForK = Math.min(remaining, myCount);
        const seen = new Set<number>();
        const rand = createLcg(
          (Math.imul(seed, 0x9e3779b1) ^
            Math.imul(k, 0x85ebca6b) ^
            Math.imul(bi + 1, 0xc2b2ae35) ^
            (wIndex + 1)) >>>
            0 || 1
        );

        for (let s = 0; s < samplesForK; s++) {
          if (signal?.aborted) return null;
          if (trialsUsed >= localMax) break;
          let pick = Math.floor(rand() * myCount);
          let rank = wIndex + pick * wCount;
          let retries = 0;
          while (seen.has(rank) && retries < 16) {
            pick = Math.floor(rand() * myCount);
            rank = wIndex + pick * wCount;
            retries += 1;
          }
          if (seen.has(rank) || rank >= totalCombos) continue;
          seen.add(rank);
          const indices = unrankCombination(n, k, rank);
          const flipModuleIds = indices.map((i) => eligible[i]);
          const hit = await trySet(flipModuleIds, "sample", n);
          if (hit) return hit;
        }
      }
    }
  }

  // ——— Phase D: priority data sampling ———
  phase = "dataSample";
  const ecBitIds = collectEcBitIds(blocks, serializedBlocks);
  const tiers = eligibleTieredDataModules(
    matrix,
    segmentTypesBySourceId,
    ecBitIds
  );
  const ordered = tiers.ordered;
  await report("sample", ordered.length);

  const kMaxD = Math.min(maxFlips, ordered.length);
  for (let k = 1; k <= kMaxD && trialsUsed < localMax; k++) {
    if (signal?.aborted) return null;
    currentK = k;
    const n = ordered.length;
    const totalCombos = combinationsCount(n, k);
    const remaining = localMax - trialsUsed;
    if (remaining < 1) break;

    const useExhaustive =
      Number.isFinite(totalCombos) && totalCombos <= maxExhaustive;

    if (useExhaustive) {
      for (let rank = wIndex; rank < totalCombos; rank += wCount) {
        if (signal?.aborted) return null;
        if (trialsUsed >= localMax) break;
        const indices = unrankCombination(n, k, rank);
        const flipModuleIds = indices.map((i) => ordered[i]);
        const hit = await trySet(flipModuleIds, "exhaustive", n);
        if (hit) return hit;
      }
    } else {
      const samplesForK = remaining;
      const seen = new Set<string>();
      const rand = createLcg(
        (Math.imul(seed, 0x9e3779b1) ^
          Math.imul(k, 0x85ebca6b) ^
          (wIndex + 1)) >>>
          0 || 1
      );
      let accepted = 0;
      let attempts = 0;
      const maxAttempts = samplesForK * 32;

      while (accepted < samplesForK && attempts < maxAttempts) {
        if (signal?.aborted) return null;
        if (trialsUsed >= localMax) break;
        attempts += 1;
        // Prefer early tiers: sample indices with bias toward front of ordered
        const flipModuleIds = sampleKSubset(ordered, k, rand);
        const key = [...flipModuleIds].sort().join("\0");
        // Simple hash shard
        let h = 2166136261;
        for (let i = 0; i < key.length; i++) {
          h ^= key.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        if ((h >>> 0) % wCount !== wIndex) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        accepted += 1;
        const hit = await trySet(flipModuleIds, "sample", n);
        if (hit) return hit;
      }
    }
  }

  // ——— Phase D fallback: uniform data/EC ———
  phase = "fallback";
  const remaining = localMax - trialsUsed;
  if (remaining > 0 && !signal?.aborted) {
    const dataEc = eligibleDataEcModules(matrix);
    await report("sample", dataEc.length);
    const fallback = await findBruteForceCollision({
      matrix,
      originalPayload,
      decode,
      maxFlips,
      maxTrials: remaining * wCount,
      maxExhaustive,
      seed: seed ^ 0xdeadbeef,
      workerIndex: wIndex,
      workerCount: wCount,
      eligibleModuleIds: dataEc,
      signal,
      onProgress: async (p) => {
        await onProgress?.({
          ...p,
          trialsUsed: trialsUsed + p.trialsUsed,
          maxTrials: localMax,
          phase: "fallback",
        });
      },
    });

    if (fallback) {
      return {
        ...fallback,
        trialsUsed: trialsUsed + fallback.trialsUsed,
      };
    }
  }

  return null;
}
