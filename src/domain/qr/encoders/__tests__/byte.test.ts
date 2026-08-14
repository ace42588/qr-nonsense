import { describe, it, expect } from "vitest";
import { encodeByte, iteratorFunc } from "../byte";
import { QREncodeError } from "../errors";
import { encodeEci } from "../eci";

function dataSymbols(segments: { type?: string; value?: number }[]) {
  return segments.filter((s) => s.type === "data");
}

describe("byte encoder (T6)", () => {
  it("encodes the full UTF-8 sequence for é, not just the first byte", () => {
    // é is U+00E9 → UTF-8 C3 A9
    const segments = encodeByte("é", "utf-8");
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0xc3, 0xa9]);
    expect(segments.find((s) => s.type === "characterCountIndicator")?.value).toBe(2);
  });

  it("encodes an emoji as four UTF-8 bytes", () => {
    // 😀 is U+1F600 → UTF-8 F0 9F 98 80
    const segments = encodeByte("😀", "utf-8");
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([
      0xf0, 0x9f, 0x98, 0x80,
    ]);
    expect(dataSymbols(segments)).toHaveLength(4);
    expect(segments.find((s) => s.type === "characterCountIndicator")?.value).toBe(4);
  });

  it("defaults to UTF-8 when encoding is omitted", () => {
    const segments = encodeByte("é");
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0xc3, 0xa9]);
  });

  it("encodes Latin-1 as one byte per code unit 0–255", () => {
    const segments = encodeByte("é", "latin1");
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0xe9]);
    expect(segments.find((s) => s.type === "characterCountIndicator")?.value).toBe(1);
  });

  it("rejects Latin-1 code points above 255", () => {
    expect(() => encodeByte("😀", "latin1")).toThrow(QREncodeError);
    expect(() => encodeByte("😀", "iso-8859-1")).toThrow(/ISO-8859-1/i);
  });

  it("still supports hex input as one symbol per byte pair", () => {
    const segments = encodeByte("c3a9", "hex");
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0xc3, 0xa9]);
  });

  it("yields one symbol per byte from the iterator", () => {
    const symbols = [...iteratorFunc("é", "utf-8")];
    expect(symbols).toHaveLength(2);
    expect(symbols.map((s) => s.value)).toEqual([0xc3, 0xa9]);
  });

  it("does not change the ECI UTF-8 whole-string path", () => {
    const segments = encodeEci("é", 26);
    expect(dataSymbols(segments).map((s) => s.value)).toEqual([0xc3, 0xa9]);
  });
});
