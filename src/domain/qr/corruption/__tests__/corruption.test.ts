import { describe, it, expect } from "vitest";
import { getEncodedMessage, getCodewords } from "../../index";
import { getMatrix } from "../../matrix";
import {
  collectFinderCorner,
  collectByPattern,
  applyVisualDamage,
  damagedIdsToDataBitIds,
  damageFinderCorner,
  corruptFormatInfo,
  damageTiming,
  damageAlignment,
  randomModules,
} from "../index";

function makeMatrix(version = 1, mask = 0) {
  const input = {
    id: "1",
    type: "string" as const,
    mode: "byte",
    data: "hello",
    encoding: "utf-8",
  };
  const encoded = getEncodedMessage([input], version, 0);
  const { codewords } = getCodewords(encoded.segments, encoded.version, 0);
  const { matrix } = getMatrix(codewords, mask, encoded.version, 0);
  return matrix;
}

describe("corruption moduleIndex", () => {
  it("collects 7×7 finder modules per corner", () => {
    const matrix = makeMatrix(1);
    const tl = collectFinderCorner(matrix, "tl");
    const tr = collectFinderCorner(matrix, "tr");
    const bl = collectFinderCorner(matrix, "bl");

    expect(tl).toHaveLength(49);
    expect(tr).toHaveLength(49);
    expect(bl).toHaveLength(49);
    expect(tl.every((m) => m.source?.name === "FinderPattern")).toBe(true);
    // Corners are distinct sets
    const tlIds = new Set(tl.map((m) => m.id));
    expect(tr.every((m) => !tlIds.has(m.id))).toBe(true);
  });

  it("collects format and timing patterns", () => {
    const matrix = makeMatrix(1);
    const format = collectByPattern(matrix, "FormatInfo");
    const timing = collectByPattern(matrix, "TimingPattern");
    expect(format.length).toBeGreaterThan(0);
    expect(timing.length).toBeGreaterThan(0);
  });
});

describe("applyVisualDamage", () => {
  it("inverts isDark and bit.value only for listed ids without mutating source", () => {
    const matrix = makeMatrix(1);
    const target = matrix[0][0];
    const originalDark = target.isDark;
    const originalValue = target.bit.value;

    const damaged = applyVisualDamage(matrix, [target.id]);

    expect(matrix[0][0].isDark).toBe(originalDark);
    expect(matrix[0][0].bit.value).toBe(originalValue);
    expect(damaged[0][0].isDark).toBe(!originalDark);
    expect(damaged[0][0].bit.value).toBe(originalValue ^ 1);
    // Untouched neighbor
    expect(damaged[0][1]).toBe(matrix[0][1]);
  });

  it("damagedIdsToDataBitIds ignores structural modules", () => {
    const matrix = makeMatrix(1);
    const finder = collectFinderCorner(matrix, "tl")[0];
    // Find a data module
    let dataModule = null;
    for (let y = 0; y < matrix.length && !dataModule; y++) {
      for (let x = 0; x < matrix.length; x++) {
        const m = matrix[y][x];
        if (m && !m.nonData && (m.bit?.id || m.bitId)) {
          dataModule = m;
          break;
        }
      }
    }
    expect(dataModule).toBeTruthy();

    const bitIds = damagedIdsToDataBitIds(matrix, [
      finder.id,
      dataModule!.id,
    ]);
    expect(bitIds).toEqual([dataModule!.bit.id || dataModule!.bitId]);
  });
});

describe("corruption presets", () => {
  it("damageFinderCorner returns 49 module ids", () => {
    const matrix = makeMatrix(1);
    expect(damageFinderCorner(matrix, "tl")).toHaveLength(49);
  });

  it("corruptFormatInfo and damageTiming return non-empty sets", () => {
    const matrix = makeMatrix(1);
    expect(corruptFormatInfo(matrix).length).toBeGreaterThan(0);
    expect(damageTiming(matrix).length).toBeGreaterThan(0);
  });

  it("damageAlignment is empty on version 1", () => {
    const matrix = makeMatrix(1);
    expect(damageAlignment(matrix)).toHaveLength(0);
  });

  it("damageAlignment is non-empty on version 2+", () => {
    const matrix = makeMatrix(2);
    expect(damageAlignment(matrix).length).toBeGreaterThan(0);
  });

  it("randomModules respects count and filter", () => {
    const matrix = makeMatrix(1);
    const all = randomModules(matrix, 5, { filter: "all" });
    expect(all).toHaveLength(5);
    const structural = randomModules(matrix, 3, { filter: "structural" });
    expect(structural).toHaveLength(3);
    for (const id of structural) {
      const [_, xs, ys] = id.match(/^mod-(\d+)-(\d+)$/) ?? [];
      const m = matrix[Number(ys)][Number(xs)];
      expect(m.nonData).toBe(true);
    }
  });
});
