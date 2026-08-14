import { describe, it, expect } from "vitest";
import { packKanji13, unicodeToKanjiShiftJis } from "../shiftJis";
import { encodeKanji } from "../kanji";
import {
  encodeEci,
  encodeEciAssignmentBits,
  encodeEciPayloadBytes,
  resolveEciAssignment,
} from "../eci";
import { encodeInput, encodeAll } from "../index";
import { QREncodeError } from "../errors";
import { getEncodedMessage } from "../../index";

function dataSymbols(segments: { type?: string }[]) {
  return segments.filter((s) => s.type === "data");
}

describe("Kanji 13-bit packing", () => {
  it("packs Shift JIS 0x8140–0x9FFC by subtracting 0x8140", () => {
    // 点 is Shift JIS 0x935F → (0x12 * 0xC0) + 0x1F = 0xD9F
    expect(packKanji13(0x935f)).toBe(0xd9f);
  });

  it("packs Shift JIS 0xE040–0xEBBF by subtracting 0xC140", () => {
    // 熙 is Shift JIS 0xEAA4
    expect(packKanji13(0xeaa4)).toBe(0x1f24);
  });

  it("rejects values outside the QR Kanji ranges", () => {
    expect(() => packKanji13(0x20)).toThrow(QREncodeError);
    expect(() => packKanji13(0xed40)).toThrow(QREncodeError);
  });
});

describe("Kanji encoder", () => {
  it("encodes a JIS X 0208 character as mode 1000 + CCI + 13-bit symbol", () => {
    const segments = encodeKanji("点");
    expect(segments[0]).toMatchObject({ type: "modeIndicator", value: 0x8, length: 4 });
    expect(segments[1]).toMatchObject({
      type: "characterCountIndicator",
      value: 1,
    });
    expect(segments[1].length).toBe(8);
    const [symbol] = dataSymbols(segments);
    expect(symbol).toMatchObject({ value: 0xd9f, length: 13, text: "点" });
  });

  it("encodes hiragana via Shift JIS (あ = 0x82A0 → 0x120)", () => {
    const sjis = unicodeToKanjiShiftJis("あ".codePointAt(0)!);
    expect(sjis).toBe(0x82a0);
    const segments = encodeKanji("あ");
    expect(dataSymbols(segments)[0].value).toBe(packKanji13(0x82a0));
  });

  it("encodes a level-2 kanji in the 0xE040 range", () => {
    const segments = encodeKanji("熙");
    expect(dataSymbols(segments)[0].value).toBe(0x1f24);
  });

  it("throws a typed error for characters that are not QR Kanji", () => {
    expect(() => encodeKanji("Hello")).toThrow(QREncodeError);
    expect(() => encodeKanji("Hello")).toThrow(/cannot be encoded in QR Kanji mode/i);
    expect(() => encodeKanji("😀")).toThrow(QREncodeError);
  });

  it("returns an empty segment list for empty input", () => {
    expect(encodeKanji("")).toEqual([]);
  });
});

describe("ECI assignment bit layout", () => {
  it("encodes 0–127 as 0 + 7 bits (8 bits total)", () => {
    expect(encodeEciAssignmentBits(0)).toEqual({ value: 0, length: 8 });
    expect(encodeEciAssignmentBits(26)).toEqual({ value: 26, length: 8 });
    expect(encodeEciAssignmentBits(127)).toEqual({ value: 127, length: 8 });
  });

  it("encodes 128–16383 as 10 + 14 bits (16 bits total)", () => {
    expect(encodeEciAssignmentBits(128)).toEqual({
      value: 0x8000 | 128,
      length: 16,
    });
    expect(encodeEciAssignmentBits(16383)).toEqual({
      value: 0x8000 | 16383,
      length: 16,
    });
  });

  it("encodes 16384–999999 as 110 + 21 bits (24 bits total)", () => {
    expect(encodeEciAssignmentBits(16384)).toEqual({
      value: 0xc00000 | 16384,
      length: 24,
    });
    expect(encodeEciAssignmentBits(999999)).toEqual({
      value: 0xc00000 | 999999,
      length: 24,
    });
  });

  it("rejects assignment numbers outside 0–999999", () => {
    expect(() => encodeEciAssignmentBits(-1)).toThrow(QREncodeError);
    expect(() => encodeEciAssignmentBits(1000000)).toThrow(QREncodeError);
  });
});

describe("ECI encoder", () => {
  it("defaults to UTF-8 assignment 26", () => {
    expect(resolveEciAssignment("")).toBe(26);
    expect(resolveEciAssignment("utf-8")).toBe(26);
    expect(resolveEciAssignment({})).toBe(26);
  });

  it("emits ECI designator without a character-count indicator, then byte mode", () => {
    const segments = encodeEci("A", "26");
    expect(segments[0]).toMatchObject({ type: "modeIndicator", value: 0x7, length: 4 });
    expect(segments[1]).toMatchObject({
      type: "eciAssignment",
      value: 26,
      length: 8,
      text: "26",
    });
    expect(segments[2]).toMatchObject({ type: "modeIndicator", value: 0x4, length: 4 });
    expect(segments[3].type).toBe("characterCountIndicator");
    expect(segments[3].value).toBe(1);
    expect(dataSymbols(segments)[0]).toMatchObject({ value: 0x41, length: 8 });
  });

  it("encodes the full UTF-8 byte sequence, not just the first byte", () => {
    // € is U+20AC → UTF-8 E2 82 AC
    const bytes = encodeEciPayloadBytes("€", 26);
    expect(Array.from(bytes)).toEqual([0xe2, 0x82, 0xac]);
    const segments = encodeEci("€", 26);
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0xe2, 0x82, 0xac]);
    expect(segments.find((s) => s.type === "characterCountIndicator")?.value).toBe(3);
  });

  it("uses 16-bit ECI assignment encoding for 128", () => {
    const segments = encodeEci("A", 128);
    expect(segments[1]).toMatchObject({
      type: "eciAssignment",
      value: 0x8000 | 128,
      length: 16,
    });
  });

  it("uses 24-bit ECI assignment encoding for 16384", () => {
    const segments = encodeEci("A", 16384);
    expect(segments[1]).toMatchObject({
      type: "eciAssignment",
      value: 0xc00000 | 16384,
      length: 24,
    });
  });
});

describe("encodeInput wiring", () => {
  it("dispatches kanji and kanjiMode", () => {
    const a = encodeInput("kanji", "点");
    const b = encodeInput("kanjiMode", "点");
    expect(a[0].value).toBe(0x8);
    expect(b[0].value).toBe(0x8);
    expect(dataSymbols(a)[0].value).toBe(0xd9f);
  });

  it("dispatches eci with default UTF-8 assignment", () => {
    const segments = encodeInput("eci", "Hi");
    expect(segments[0].value).toBe(0x7);
    expect(segments[1]).toMatchObject({ type: "eciAssignment", value: 26, length: 8 });
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0x48, 0x69]);
  });

  it("does not throw from encodeAll for invalid kanji; returns an error instead", () => {
    expect(() =>
      encodeAll({ a: { mode: "kanji", data: "ABC" } })
    ).not.toThrow();
    const [segments, , error] = encodeAll({ a: { mode: "kanji", data: "ABC" } });
    expect(error).toMatch(/Kanji/i);
    expect(segments.filter((s) => s.type === "data")).toEqual([]);
  });

  it("does not throw from encodeAll for a bad ECI assignment", () => {
    const [, , error] = encodeAll({
      a: { mode: "eci", data: "A", encoding: "not-an-eci" },
    });
    expect(error).toMatch(/ECI/i);
  });
});

describe("getEncodedMessage does not crash on kanji/eci", () => {
  it("returns an error instead of throwing for invalid kanji", () => {
    const result = getEncodedMessage(
      [{ id: "1", type: "string", mode: "kanji", data: "Hello" }],
      -1,
      0
    );
    expect(result.error).toMatch(/Kanji/i);
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.version).toBeGreaterThanOrEqual(1);
  });

  it("encodes valid kanji and uses 8-bit CCI on version 1", () => {
    const result = getEncodedMessage(
      [{ id: "1", type: "string", mode: "kanji", data: "点" }],
      1,
      0
    );
    expect(result.error).toBeFalsy();
    const cci = result.segments.find((s) => s.type === "characterCountIndicator");
    expect(cci?.length).toBe(8);
    expect(cci?.value).toBe(1);
  });

  it("uses 10-bit kanji CCI on version 10", () => {
    const result = getEncodedMessage(
      [{ id: "1", type: "string", mode: "kanji", data: "点" }],
      10,
      0
    );
    const cci = result.segments.find((s) => s.type === "characterCountIndicator");
    expect(cci?.length).toBe(10);
  });

  it("encodes ECI 26 + UTF-8 payload", () => {
    const result = getEncodedMessage(
      [{ id: "1", type: "string", mode: "eci", data: "A", encoding: "26" }],
      1,
      0
    );
    expect(result.error).toBeFalsy();
    expect(result.segments[0]).toMatchObject({ type: "modeIndicator", value: 0x7 });
    expect(result.segments[1].type).toBe("eciAssignment");
    expect(result.segments[1].type).not.toBe("characterCountIndicator");
  });
});
