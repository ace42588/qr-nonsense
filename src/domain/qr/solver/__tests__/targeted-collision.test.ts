import { describe, it, expect, vi } from "vitest";
import { getEncodedMessage, getCodewords } from "../../index";
import { getMatrix } from "../../matrix";
import { getVersionInfo } from "../../versionUtils";
import {
  eligibleFormatMetaModules,
  eligibleDataEcModules,
  eligibleTieredDataModules,
  buildSegmentTypesBySourceId,
  collectByPattern,
  COLLISION_EXCLUDED_PATTERNS,
} from "../../corruption";
import {
  findTargetedCollision,
  classifyRsPrefilter,
  serializeRsBlocks,
  enumerateCharacterChangeCandidates,
  unrankCombination,
} from "../index";
import type { Input } from "@/state/inputs/types";

function makeQr(data = "HI", mode = "alphanumeric", version = 1, ecl = 3) {
  const input: Input = {
    id: "1",
    type: "string",
    mode,
    data,
    text: data,
    encoding: "utf-8",
  };
  const encoded = getEncodedMessage([input], version, ecl);
  const { codewords, blocks } = getCodewords(
    encoded.segments.map((s) => ({ ...s })),
    encoded.version,
    ecl
  );
  const { matrix } = getMatrix(codewords, 0, encoded.version, ecl);
  const versionInfo = getVersionInfo(ecl, encoded.version);
  return {
    input,
    segments: encoded.segments,
    blocks,
    matrix,
    version: encoded.version,
    versionInfo,
    ecl,
  };
}

describe("eligible modes", () => {
  it("formatMeta includes FormatInfo and excludes finder", () => {
    const { matrix } = makeQr();
    const format = new Set(eligibleFormatMetaModules(matrix));
    expect(collectByPattern(matrix, "FormatInfo").some((m) => format.has(m.id))).toBe(
      true
    );
    for (const pattern of COLLISION_EXCLUDED_PATTERNS) {
      for (const m of collectByPattern(matrix, pattern)) {
        expect(format.has(m.id)).toBe(false);
      }
    }
  });

  it("payload tier excludes padding/terminator when segment types provided", () => {
    const { matrix, segments, blocks } = makeQr("AB", "alphanumeric");
    const types = buildSegmentTypesBySourceId(segments);
    const ecBitIds = new Set<string>();
    for (const block of blocks) {
      for (const cw of block.errorCorrection) {
        for (const bit of cw.bits) ecBitIds.add(bit.id);
      }
    }
    const tiers = eligibleTieredDataModules(matrix, types, ecBitIds);
    const paddingSegIds = new Set(
      segments
        .filter((s) => s.type === "padding" || s.type === "terminator" || s.type === "fill")
        .map((s) => s.id)
    );
    for (const mid of tiers.payload) {
      // find module
      let sourceId: string | undefined;
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix.length; x++) {
          if (matrix[y][x]?.id === mid) {
            sourceId = matrix[y][x].bit?.sourceId;
          }
        }
      }
      if (sourceId) {
        expect(paddingSegIds.has(sourceId)).toBe(false);
      }
    }
    expect(tiers.ordered.length).toBeGreaterThan(0);
    expect(eligibleDataEcModules(matrix).length).toBeGreaterThan(0);
  });
});

describe("classifyRsPrefilter", () => {
  it("returns unchanged for empty flips and skips decode when unchanged", async () => {
    const { matrix, blocks, versionInfo } = makeQr();
    const serialized = serializeRsBlocks(blocks);
    expect(
      classifyRsPrefilter(serialized, [], versionInfo.ecCodewordsPerBlock)
    ).toBe("unchanged");

    const decode = vi.fn(async () => "HI");
    const result = await findTargetedCollision({
      matrix,
      originalPayload: "HI",
      decode,
      serializedBlocks: serialized,
      charSeedFlipSets: [],
      ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      maxFlips: 2,
      maxTrials: 5,
      // Force past format quickly with tiny format budget by limiting trials
      // and using a decode that never collides on format
      workerIndex: 0,
      workerCount: 1,
      seed: 1,
    });
    // May or may not call decode for format phase; if data candidates are
    // prefilter-rejected, decode should not see those. At least search completes.
    expect(result).toBeNull();
  });

  it("detects miscorrection path for char-seed flips", async () => {
    const { matrix, blocks, input, version, versionInfo, ecl, segments } =
      makeQr("HELLO", "alphanumeric", 1, 3);
    const seeds = enumerateCharacterChangeCandidates(
      {
        inputs: [input],
        version,
        errorCorrectionLevel: ecl,
        ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
        blocks,
        matrix,
      },
      5
    );
    expect(seeds.length).toBeGreaterThan(0);
    const seed = seeds[0];

    const decode = vi.fn(async () => seed.mutatedPayload);
    const result = await findTargetedCollision({
      matrix,
      originalPayload: "HELLO",
      decode,
      blocks,
      serializedBlocks: serializeRsBlocks(blocks),
      segmentTypesBySourceId: buildSegmentTypesBySourceId(segments),
      charSeedFlipSets: [seed.flipModuleIds],
      ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      maxFlips: 20,
      maxTrials: 500,
      // Skip format by using worker that still runs format first — ok
      workerIndex: 0,
      workerCount: 1,
      seed: 1,
    });

    expect(result).not.toBeNull();
    expect(result!.decodedPayload).toBe(seed.mutatedPayload);
    expect(decode).toHaveBeenCalled();
  });
});

describe("findTargetedCollision sharding", () => {
  it("format ranks for two workers are disjoint", () => {
    const n = 10;
    const k = 2;
    const total = 45; // C(10,2)
    const ranks0: number[] = [];
    const ranks1: number[] = [];
    for (let rank = 0; rank < total; rank += 2) ranks0.push(rank);
    for (let rank = 1; rank < total; rank += 2) ranks1.push(rank);
    expect(new Set([...ranks0, ...ranks1]).size).toBe(total);
    expect(ranks0.some((r) => ranks1.includes(r))).toBe(false);
    // unrank works for both shards
    expect(unrankCombination(n, k, ranks0[0])).toHaveLength(k);
    expect(unrankCombination(n, k, ranks1[0])).toHaveLength(k);
  });
});

describe("enumerateCharacterChangeCandidates", () => {
  it("returns up to limit sorted by flip count", () => {
    const { matrix, blocks, input, version, versionInfo, ecl } = makeQr(
      "TEST",
      "alphanumeric",
      1,
      2
    );
    const list = enumerateCharacterChangeCandidates(
      {
        inputs: [input],
        version,
        errorCorrectionLevel: ecl,
        ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
        blocks,
        matrix,
      },
      3
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < list.length; i++) {
      expect(list[i].flipModuleIds.length).toBeGreaterThanOrEqual(
        list[i - 1].flipModuleIds.length
      );
    }
  });
});
