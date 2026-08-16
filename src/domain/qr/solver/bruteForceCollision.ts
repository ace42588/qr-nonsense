/**
 * Brute-force search for module flip sets (≤ maxFlips) that make a decoder
 * return a different payload than the original (a collision).
 *
 * Eligible modules exclude finder / timing / alignment / separator.
 * Format, version, data/EC, etc. are fair game.
 *
 * Supports sharding via workerIndex / workerCount so parallel workers never
 * repeat the same flip-set trial.
 */

import { QRMatrix } from "@/domain/shared/types";
import {
  applyVisualDamage,
  eligibleCollisionModules,
} from "@/domain/qr/corruption";

export type CollisionDecodeFn = (
  damagedMatrix: QRMatrix
) => string | null | Promise<string | null>;

export interface BruteForceCollisionOptions {
  matrix: QRMatrix;
  /** Expected / original payload; collision = decode ≠ this (and non-null). */
  originalPayload: string;
  decode: CollisionDecodeFn;
  maxFlips?: number;
  maxTrials?: number;
  /** If C(n,k) ≤ this, enumerate all k-subsets; otherwise sample. */
  maxExhaustive?: number;
  /** Seed for deterministic sampling (LCG). Default 1. */
  seed?: number;
  /** Shard index in [0, workerCount). Default 0. */
  workerIndex?: number;
  /** Number of shards. Default 1. */
  workerCount?: number;
  /** Override eligible module ids (defaults to eligibleCollisionModules). */
  eligibleModuleIds?: string[];
  /** Abort cooperative search between trials. */
  signal?: AbortSignal;
  /** Called after trials. May be async; search awaits it so the UI can paint. */
  onProgress?: (
    progress: BruteForceCollisionProgress
  ) => void | Promise<void>;
}

export type CollisionSearchPhase =
  | "format"
  | "charSeed"
  | "blockSphere"
  | "dataSample"
  | "fallback";

export interface BruteForceCollisionProgress {
  trialsUsed: number;
  maxTrials: number;
  /** Current flip-set size being searched. */
  k: number;
  maxFlips: number;
  mode: "exhaustive" | "sample";
  eligibleCount: number;
  workerIndex?: number;
  workerCount?: number;
  phase?: CollisionSearchPhase;
}

export interface BruteForceCollisionResult {
  flipModuleIds: string[];
  flipCount: number;
  decodedPayload: string;
  trialsUsed: number;
}

const DEFAULT_MAX_FLIPS = 20;
const DEFAULT_MAX_TRIALS = 3000;
const DEFAULT_MAX_EXHAUSTIVE = 5000;

function createLcg(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state / 0x100000000;
  };
}

/** Split a global trial budget across workers (remainder goes to lower indices). */
export function trialBudgetForWorker(
  maxTrials: number,
  workerIndex: number,
  workerCount: number
): number {
  if (maxTrials < 1 || workerCount < 1 || workerIndex < 0 || workerIndex >= workerCount) {
    return 0;
  }
  return (
    Math.floor(maxTrials / workerCount) +
    (workerIndex < maxTrials % workerCount ? 1 : 0)
  );
}

/** Binomial coefficient C(n,k), capped — returns Infinity if it exceeds Number.MAX_SAFE_INTEGER path. */
export function combinationsCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
    if (result > Number.MAX_SAFE_INTEGER) return Number.POSITIVE_INFINITY;
  }
  return Math.round(result);
}

/**
 * Trials needed to exhaust flip sets of size 1..maxFlips over `eligibleCount`
 * modules: Σ C(n,k) for k = 1..min(maxFlips, n).
 * Returns Infinity if any term overflows Number.MAX_SAFE_INTEGER.
 */
export function exhaustiveSearchSpaceSize(
  eligibleCount: number,
  maxFlips: number
): number {
  const n = Math.max(0, Math.floor(eligibleCount));
  const kMax = Math.min(Math.max(0, Math.floor(maxFlips)), n);
  if (n === 0 || kMax < 1) return 0;

  let total = 0;
  for (let k = 1; k <= kMax; k++) {
    const c = combinationsCount(n, k);
    if (!Number.isFinite(c)) return Number.POSITIVE_INFINITY;
    total += c;
    if (total > Number.MAX_SAFE_INTEGER) return Number.POSITIVE_INFINITY;
  }
  return total;
}

/** Finite trial budget for a search that aims to cover the exhaustive space. */
export function trialsToExhaustSearchSpace(
  eligibleCount: number,
  maxFlips: number
): number {
  const space = exhaustiveSearchSpaceSize(eligibleCount, maxFlips);
  if (!Number.isFinite(space) || space < 1) {
    return Number.MAX_SAFE_INTEGER;
  }
  return space;
}

/**
 * Lexicographic next combination of k indices into n items (in-place).
 * Returns false when exhausted.
 */
export function nextCombination(indices: number[], n: number): boolean {
  const k = indices.length;
  for (let i = k - 1; i >= 0; i--) {
    if (indices[i] < n - k + i) {
      indices[i] += 1;
      for (let j = i + 1; j < k; j++) {
        indices[j] = indices[j - 1] + 1;
      }
      return true;
    }
  }
  return false;
}

/**
 * Lexicographic unrank: the `rank`-th (0-based) k-subset of {0..n-1}.
 * Requires a finite C(n,k) and 0 ≤ rank < C(n,k).
 */
export function unrankCombination(
  n: number,
  k: number,
  rank: number
): number[] {
  if (k < 0 || k > n || rank < 0) {
    throw new RangeError("unrankCombination: invalid n/k/rank");
  }
  const combo: number[] = [];
  let r = rank;
  let start = 0;
  for (let i = 0; i < k; i++) {
    let found = false;
    for (let x = start; x < n; x++) {
      const c = combinationsCount(n - x - 1, k - i - 1);
      if (!Number.isFinite(c)) {
        throw new RangeError("unrankCombination: C(n,k) too large");
      }
      if (r < c) {
        combo.push(x);
        start = x + 1;
        found = true;
        break;
      }
      r -= c;
    }
    if (!found) {
      throw new RangeError("unrankCombination: rank out of range");
    }
  }
  return combo;
}

/** How many combination ranks belong to this worker (stride shard). */
export function shardRankCount(
  totalCombos: number,
  workerIndex: number,
  workerCount: number
): number {
  if (
    !Number.isFinite(totalCombos) ||
    totalCombos <= 0 ||
    workerCount < 1 ||
    workerIndex < 0 ||
    workerIndex >= workerCount
  ) {
    return 0;
  }
  if (workerIndex >= totalCombos) return 0;
  return Math.floor((totalCombos - 1 - workerIndex) / workerCount) + 1;
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

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function tryFlipSet(
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
 * Search ascending k = 1..maxFlips for a flip set that collides under `decode`.
 * Returns the first hit (smallest k under the trial budget), or null.
 *
 * With workerCount > 1, each worker only tries combinations in its shard
 * (exhaustive: rank % workerCount === workerIndex; sample: same residue or
 * hash partition when C is infinite).
 */
export async function findBruteForceCollision(
  options: BruteForceCollisionOptions
): Promise<BruteForceCollisionResult | null> {
  const {
    matrix,
    originalPayload,
    decode,
    maxFlips = DEFAULT_MAX_FLIPS,
    maxTrials = DEFAULT_MAX_TRIALS,
    maxExhaustive = DEFAULT_MAX_EXHAUSTIVE,
    seed = 1,
    workerIndex = 0,
    workerCount = 1,
    eligibleModuleIds,
    signal,
    onProgress,
  } = options;

  const wCount = Math.max(1, Math.floor(workerCount));
  const wIndex = Math.max(0, Math.floor(workerIndex));
  if (wIndex >= wCount) return null;

  const localMax = trialBudgetForWorker(maxTrials, wIndex, wCount);
  if (!matrix?.length || maxFlips < 1 || localMax < 1) return null;
  if (signal?.aborted) return null;

  const eligible =
    eligibleModuleIds?.length
      ? [...eligibleModuleIds]
      : eligibleCollisionModules(matrix);
  const n = eligible.length;
  if (n === 0) return null;

  let trialsUsed = 0;
  const kMax = Math.min(maxFlips, n);

  const report = async (k: number, mode: "exhaustive" | "sample") => {
    await onProgress?.({
      trialsUsed,
      maxTrials: localMax,
      k,
      maxFlips: kMax,
      mode,
      eligibleCount: n,
      workerIndex: wIndex,
      workerCount: wCount,
    });
  };

  for (let k = 1; k <= kMax; k++) {
    if (signal?.aborted) return null;
    if (trialsUsed >= localMax) break;

    const remaining = localMax - trialsUsed;
    const totalCombos = combinationsCount(n, k);
    const useExhaustive =
      Number.isFinite(totalCombos) && totalCombos <= maxExhaustive;
    const mode = useExhaustive ? "exhaustive" : "sample";
    await report(k, mode);

    if (useExhaustive) {
      for (
        let rank = wIndex;
        rank < totalCombos;
        rank += wCount
      ) {
        if (signal?.aborted) return null;
        if (trialsUsed >= localMax) break;

        const indices = unrankCombination(n, k, rank);
        const flipModuleIds = indices.map((i) => eligible[i]);
        trialsUsed += 1;
        await report(k, mode);
        const decoded = await tryFlipSet(
          matrix,
          flipModuleIds,
          originalPayload,
          decode
        );
        if (decoded != null) {
          return {
            flipModuleIds,
            flipCount: k,
            decodedPayload: decoded,
            trialsUsed,
          };
        }
      }
    } else if (Number.isFinite(totalCombos) && totalCombos > 0) {
      const myCount = shardRankCount(totalCombos, wIndex, wCount);
      if (myCount === 0) continue;

      const samplesForK = Math.min(remaining, myCount);
      const seen = new Set<number>();
      const rand = createLcg(
        (Math.imul(seed, 0x9e3779b1) ^
          Math.imul(k, 0x85ebca6b) ^
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
        trialsUsed += 1;
        await report(k, mode);
        const decoded = await tryFlipSet(
          matrix,
          flipModuleIds,
          originalPayload,
          decode
        );
        if (decoded != null) {
          return {
            flipModuleIds,
            flipCount: k,
            decodedPayload: decoded,
            trialsUsed,
          };
        }
      }
    } else {
      // C(n,k) too large to unrank — hash-partition random samples.
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

        const flipModuleIds = sampleKSubset(eligible, k, rand);
        const key = [...flipModuleIds].sort().join("\0");
        if (hashKey(key) % wCount !== wIndex) continue;
        if (seen.has(key)) continue;
        seen.add(key);

        accepted += 1;
        trialsUsed += 1;
        await report(k, mode);
        const decoded = await tryFlipSet(
          matrix,
          flipModuleIds,
          originalPayload,
          decode
        );
        if (decoded != null) {
          return {
            flipModuleIds,
            flipCount: k,
            decodedPayload: decoded,
            trialsUsed,
          };
        }
      }
    }
  }

  return null;
}
