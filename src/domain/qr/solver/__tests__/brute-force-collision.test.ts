import { describe, it, expect } from "vitest";
import { getEncodedMessage, getCodewords } from "../../index";
import { getMatrix } from "../../matrix";
import {
  eligibleCollisionModules,
  collectByPattern,
  COLLISION_EXCLUDED_PATTERNS,
} from "../../corruption";
import {
  findBruteForceCollision,
  combinationsCount,
  nextCombination,
  unrankCombination,
  trialBudgetForWorker,
  shardRankCount,
  exhaustiveSearchSpaceSize,
  trialsToExhaustSearchSpace,
} from "../index";
import type { Input } from "@/state/inputs/types";
import type { QRMatrix } from "@/domain/shared/types";

function makeMatrix(data = "hi", version = 1, ecl = 0, mask = 0): QRMatrix {
  const input: Input = {
    id: "1",
    type: "string",
    mode: "byte",
    data,
    text: data,
    encoding: "utf-8",
  };
  const encoded = getEncodedMessage([input], version, ecl);
  const { codewords } = getCodewords(
    encoded.segments.map((s) => ({ ...s })),
    encoded.version,
    ecl
  );
  const { matrix } = getMatrix(codewords, mask, encoded.version, ecl);
  return matrix;
}

describe("eligibleCollisionModules", () => {
  it("excludes finder, timing, alignment, separator; includes format", () => {
    const matrix = makeMatrix("hello", 2, 0, 0);
    const eligible = new Set(eligibleCollisionModules(matrix));

    for (const pattern of COLLISION_EXCLUDED_PATTERNS) {
      for (const m of collectByPattern(matrix, pattern)) {
        expect(eligible.has(m.id)).toBe(false);
      }
    }

    const format = collectByPattern(matrix, "FormatInfo");
    expect(format.length).toBeGreaterThan(0);
    expect(format.some((m) => eligible.has(m.id))).toBe(true);

    // Some data modules should be eligible
    let dataEligible = 0;
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix.length; x++) {
        const m = matrix[y]?.[x];
        if (m && !m.nonData && eligible.has(m.id)) dataEligible += 1;
      }
    }
    expect(dataEligible).toBeGreaterThan(0);
  });
});

describe("combinations / nextCombination / unrank", () => {
  it("counts C(5,2) = 10", () => {
    expect(combinationsCount(5, 2)).toBe(10);
  });

  it("enumerates all C(4,2) combinations", () => {
    const indices = [0, 1];
    const seen: string[] = [[0, 1].join(",")];
    while (nextCombination(indices, 4)) {
      seen.push(indices.join(","));
    }
    expect(seen).toEqual(["0,1", "0,2", "0,3", "1,2", "1,3", "2,3"]);
  });

  it("unrankCombination matches lex order of nextCombination", () => {
    const n = 5;
    const k = 3;
    const total = combinationsCount(n, k);
    const indices = Array.from({ length: k }, (_, i) => i);
    const lex: string[] = [indices.join(",")];
    while (nextCombination(indices, n)) {
      lex.push(indices.join(","));
    }
    expect(lex).toHaveLength(total);
    for (let rank = 0; rank < total; rank++) {
      expect(unrankCombination(n, k, rank).join(",")).toBe(lex[rank]);
    }
  });

  it("trialBudgetForWorker splits remainder to lower indices", () => {
    expect(trialBudgetForWorker(10, 0, 3)).toBe(4);
    expect(trialBudgetForWorker(10, 1, 3)).toBe(3);
    expect(trialBudgetForWorker(10, 2, 3)).toBe(3);
    expect(trialBudgetForWorker(7, 0, 1)).toBe(7);
  });

  it("exhaustiveSearchSpaceSize sums C(n,1)+…+C(n,kMax)", () => {
    // C(5,1)+C(5,2)+C(5,3) = 5+10+10 = 25
    expect(exhaustiveSearchSpaceSize(5, 3)).toBe(25);
    expect(exhaustiveSearchSpaceSize(5, 0)).toBe(0);
    expect(exhaustiveSearchSpaceSize(0, 5)).toBe(0);
    // C(9,1)+C(9,2) = 9+36 = 45
    expect(exhaustiveSearchSpaceSize(9, 2)).toBe(45);
    expect(trialsToExhaustSearchSpace(9, 2)).toBe(45);
  });

  it("shardRankCount covers every rank exactly once", () => {
    const total = 10;
    const workerCount = 3;
    let sum = 0;
    const seen = new Set<number>();
    for (let w = 0; w < workerCount; w++) {
      sum += shardRankCount(total, w, workerCount);
      for (let r = w; r < total; r += workerCount) {
        expect(seen.has(r)).toBe(false);
        seen.add(r);
      }
    }
    expect(sum).toBe(total);
    expect(seen.size).toBe(total);
  });
});

describe("findBruteForceCollision", () => {
  it("finds a known 2-module collision via mock decode", async () => {
    const matrix = makeMatrix("ab", 1, 0, 0);
    const eligible = eligibleCollisionModules(matrix);
    expect(eligible.length).toBeGreaterThanOrEqual(2);

    const result = await findBruteForceCollision({
      matrix,
      originalPayload: "ab",
      maxFlips: 5,
      maxTrials: 5000,
      maxExhaustive: 5000,
      seed: 42,
      decode: (damaged) => {
        let flipped = 0;
        for (let y = 0; y < matrix.length; y++) {
          for (let x = 0; x < matrix.length; x++) {
            const o = matrix[y][x];
            const d = damaged[y][x];
            if (o && d && o.isDark !== d.isDark) flipped += 1;
          }
        }
        // First size-2 set tried at k=2 is a collision
        if (flipped === 2) return "COLLISION";
        return "ab";
      },
    });

    expect(result).not.toBeNull();
    expect(result!.flipCount).toBe(2);
    expect(result!.flipModuleIds).toHaveLength(2);
    expect(result!.decodedPayload).toBe("COLLISION");
    expect(result!.trialsUsed).toBeGreaterThan(0);

    for (const id of result!.flipModuleIds) {
      expect(eligible).toContain(id);
    }
  });

  it("finds a specific eligible pair when n is small enough to enumerate", async () => {
    const cell = (
      id: string,
      x: number,
      y: number,
      opts: { nonData?: boolean; name?: string; dark?: boolean } = {}
    ) => ({
      id,
      bitId: `b-${id}`,
      bit: { id: `b-${id}`, value: opts.dark ? 1 : 0, sourceId: "s" },
      x,
      y,
      isDark: !!opts.dark,
      isMasked: false,
      ...(opts.nonData
        ? { nonData: true, source: { id: "p", name: opts.name } }
        : {}),
    });

    // 2×2 square matrix: three eligible + one finder
    const tiny = [
      [cell("a", 0, 0, { dark: true }), cell("b", 1, 0, { dark: false })],
      [
        cell("c", 0, 1, { dark: true }),
        cell("finder", 1, 1, {
          dark: true,
          nonData: true,
          name: "FinderPattern",
        }),
      ],
    ] as unknown as QRMatrix;

    expect(eligibleCollisionModules(tiny).sort()).toEqual(["a", "b", "c"]);

    const targetKey = ["a", "b"].join("|");

    const result = await findBruteForceCollision({
      matrix: tiny,
      originalPayload: "orig",
      maxFlips: 3,
      maxTrials: 100,
      seed: 1,
      decode: (damaged) => {
        const flipped: string[] = [];
        for (let y = 0; y < damaged.length; y++) {
          for (let x = 0; x < damaged[y].length; x++) {
            const o = tiny[y][x];
            const d = damaged[y][x];
            if (o && d && o.isDark !== d.isDark) flipped.push(o.id);
          }
        }
        if ([...flipped].sort().join("|") === targetKey) return "HIT";
        return "orig";
      },
    });

    expect(result).not.toBeNull();
    expect(result!.flipCount).toBe(2);
    expect([...result!.flipModuleIds].sort()).toEqual(["a", "b"]);
    expect(result!.flipModuleIds).not.toContain("finder");
  });

  it("returns null when decode never collides", async () => {
    const matrix = makeMatrix("xy", 1, 0, 0);
    const result = await findBruteForceCollision({
      matrix,
      originalPayload: "xy",
      maxFlips: 3,
      maxTrials: 50,
      seed: 1,
      decode: () => "xy",
    });
    expect(result).toBeNull();
  });

  it("never returns excluded-pattern module ids", async () => {
    const matrix = makeMatrix("zz", 2, 0, 0);
    const excluded = new Set<string>();
    for (const pattern of COLLISION_EXCLUDED_PATTERNS) {
      for (const m of collectByPattern(matrix, pattern)) {
        excluded.add(m.id);
      }
    }

    // Force a hit on the first eligible singleton
    const eligible = eligibleCollisionModules(matrix);
    const hitId = eligible[0];

    const result = await findBruteForceCollision({
      matrix,
      originalPayload: "zz",
      maxFlips: 1,
      maxTrials: 100,
      decode: (damaged) => {
        for (let y = 0; y < matrix.length; y++) {
          for (let x = 0; x < matrix.length; x++) {
            const o = matrix[y][x];
            const d = damaged[y][x];
            if (o?.id === hitId && o.isDark !== d.isDark) return "HIT";
          }
        }
        return "zz";
      },
    });

    expect(result).not.toBeNull();
    for (const id of result!.flipModuleIds) {
      expect(excluded.has(id)).toBe(false);
    }
  });

  it("respects maxTrials budget", async () => {
    const matrix = makeMatrix("qq", 1, 0, 0);
    let calls = 0;
    const result = await findBruteForceCollision({
      matrix,
      originalPayload: "qq",
      maxFlips: 20,
      maxTrials: 7,
      maxExhaustive: 1, // force sampling for k>=1 when C(n,1)=n > 1... wait n is large
      seed: 3,
      decode: () => {
        calls += 1;
        return "qq";
      },
    });
    expect(result).toBeNull();
    expect(calls).toBe(7);
  });

  it("reports progress via onProgress", async () => {
    const matrix = makeMatrix("pg", 1, 0, 0);
    const updates = [];
    await findBruteForceCollision({
      matrix,
      originalPayload: "pg",
      maxFlips: 2,
      maxTrials: 5,
      maxExhaustive: 1,
      seed: 1,
      decode: () => "pg",
      onProgress: (p) => updates.push({ ...p }),
    });
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1].trialsUsed).toBe(5);
    expect(updates.every((u) => u.maxTrials === 5)).toBe(true);
    expect(updates.some((u) => u.k >= 1)).toBe(true);
  });

  it("shards exhaustive search with no overlapping flip sets", async () => {
    const cell = (id: string, x: number, y: number, dark = false) => ({
      id,
      bitId: `b-${id}`,
      bit: { id: `b-${id}`, value: dark ? 1 : 0, sourceId: "s" },
      x,
      y,
      isDark: dark,
      isMasked: false,
    });

    const tiny = [
      [cell("a", 0, 0, true), cell("b", 1, 0), cell("c", 2, 0, true)],
      [cell("d", 0, 1), cell("e", 1, 1, true), cell("f", 2, 1)],
      [cell("g", 0, 2, true), cell("h", 1, 2), cell("i", 2, 2, true)],
    ] as unknown as QRMatrix;

    const eligible = eligibleCollisionModules(tiny);
    expect(eligible.length).toBe(9);

    const keysByWorker: string[][] = [[], []];
    const workerCount = 2;
    const maxFlips = 2;

    await Promise.all(
      [0, 1].map(async (workerIndex) => {
        await findBruteForceCollision({
          matrix: tiny,
          originalPayload: "orig",
          maxFlips,
          maxTrials: 10_000,
          maxExhaustive: 10_000,
          workerIndex,
          workerCount,
          decode: (damaged) => {
            const flipped: string[] = [];
            for (let y = 0; y < damaged.length; y++) {
              for (let x = 0; x < damaged[y].length; x++) {
                const o = tiny[y][x];
                const d = damaged[y][x];
                if (o && d && o.isDark !== d.isDark) flipped.push(o.id);
              }
            }
            keysByWorker[workerIndex].push([...flipped].sort().join("|"));
            return "orig";
          },
        });
      })
    );

    const all = keysByWorker.flat();
    expect(new Set(all).size).toBe(all.length);

    // Exhaustive k=1..2 over 9 modules: C(9,1)+C(9,2)=9+36=45
    expect(all.length).toBe(45);
  });

  it("stops decode calls after AbortSignal abort", async () => {
    const matrix = makeMatrix("ab", 1, 0, 0);
    const controller = new AbortController();
    let calls = 0;

    const result = await findBruteForceCollision({
      matrix,
      originalPayload: "ab",
      maxFlips: 5,
      maxTrials: 500,
      maxExhaustive: 1,
      seed: 1,
      signal: controller.signal,
      decode: async () => {
        calls += 1;
        if (calls === 3) controller.abort();
        return "ab";
      },
    });

    expect(result).toBeNull();
    expect(calls).toBeLessThan(500);
    expect(calls).toBeGreaterThanOrEqual(3);
    expect(calls).toBeLessThanOrEqual(5);
  });
});
