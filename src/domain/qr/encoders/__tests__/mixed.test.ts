import { describe, it, expect } from "vitest";
import { encodeByte } from "../byte";
import { encodeInput, encodeAll } from "../index";
import { chooseMixedSegments, encodeMixed } from "../mixed";
import { MIXED_MODE } from "../optimize";
import { getNumBits } from "../utils";
import { updateCharCountIndicatorLengths } from "../../charCount";
import { getEncodedMessage } from "../../index";
import { parseBasic } from "@/domain/input/parsers/parseBasic";

function payloadBits(
  segments: { type?: string; length: number }[],
  version = 1
): number {
  const updated = updateCharCountIndicatorLengths(segments as any, version);
  return getNumBits(
    updated.filter(
      (s) => s.type !== "terminator" && s.type !== "fill" && s.type !== "padding"
    )
  );
}

function encodedPayloadBits(text: string, mode: string, version = 1): number {
  const result = getEncodedMessage(
    [{ id: "1", type: "string", mode, data: text, text, encoding: "utf-8" } as any],
    version === 1 ? 1 : version,
    0
  );
  expect(result.error).toBeFalsy();
  return payloadBits(result.segments, result.version);
}

describe("mixed-mode encoder", () => {
  it("reconstructs the original payload without uppercasing", () => {
    const text = "Hello 123 点";
    const parts = chooseMixedSegments(text);
    expect(parts.map((p) => p.data).join("")).toBe(text);
    expect(parts.some((p) => p.data.includes("e"))).toBe(true);
  });

  it("encodes digits as numeric, which is shorter than byte", () => {
    const text = "12345";
    const parts = chooseMixedSegments(text);
    expect(parts).toEqual([{ mode: "numeric", data: text }]);
    expect(payloadBits(encodeMixed(text))).toBeLessThan(
      payloadBits(encodeByte(text, "utf-8"))
    );
  });

  it("encodes uppercase QR alphanumeric as alphanumeric, which is shorter than byte", () => {
    const text = "HELLO WORLD";
    const parts = chooseMixedSegments(text);
    expect(parts).toEqual([{ mode: "alphanumeric", data: text }]);
    expect(payloadBits(encodeMixed(text))).toBeLessThan(
      payloadBits(encodeByte(text, "utf-8"))
    );
  });

  it("encodes kanji-mode characters as kanji, which is shorter than UTF-8 byte", () => {
    const text = "点点点";
    const parts = chooseMixedSegments(text);
    expect(parts).toEqual([{ mode: "kanji", data: text }]);
    expect(payloadBits(encodeMixed(text))).toBeLessThan(
      payloadBits(encodeByte(text, "utf-8"))
    );
  });

  it("splits numeric and lowercase byte runs into a shorter mixed bitstream", () => {
    const text = "12345hello";
    const parts = chooseMixedSegments(text);
    expect(parts.map((p) => p.mode)).toEqual(["numeric", "byte"]);
    expect(parts.map((p) => p.data)).toEqual(["12345", "hello"]);
    expect(payloadBits(encodeMixed(text))).toBeLessThan(
      payloadBits(encodeByte(text, "utf-8"))
    );
  });

  it("splits kanji and digits into a shorter mixed bitstream", () => {
    const text = "価格123";
    const parts = chooseMixedSegments(text);
    expect(parts.map((p) => p.mode)).toEqual(["kanji", "numeric"]);
    expect(parts.map((p) => p.data)).toEqual(["価格", "123"]);
    expect(payloadBits(encodeMixed(text))).toBeLessThan(
      payloadBits(encodeByte(text, "utf-8"))
    );
  });

  it("is never longer than a single byte segment", () => {
    const samples = [
      "",
      "A",
      "a",
      "1",
      "Hello",
      "HELLO",
      "12345",
      "HELLO123",
      "12345hello",
      "QRコード",
      "点A1",
      "https://example.com/abc?x=12",
      "😀123",
      "TEL:555-1212",
    ];
    for (const text of samples) {
      expect(payloadBits(encodeMixed(text))).toBeLessThanOrEqual(
        payloadBits(encodeByte(text || "", "utf-8"))
      );
    }
  });

  it("wires through encodeInput and encodeAll as mixed", () => {
    const text = "12345hello";
    const fromInput = encodeInput(MIXED_MODE, text);
    const fromMixed = encodeMixed(text);
    expect(payloadBits(fromInput)).toBe(payloadBits(fromMixed));

    const [segments, , error] = encodeAll({
      a: { id: "a", mode: MIXED_MODE, data: text },
    });
    expect(error).toBeNull();
    expect(segments.filter((s) => s.type === "modeIndicator").length).toBe(2);
    expect(segments.every((s) => s.inputId === "a")).toBe(true);
  });

  it("still accepts the legacy auto mode name", () => {
    const text = "12345hello";
    expect(payloadBits(encodeInput("auto", text))).toBe(
      payloadBits(encodeMixed(text))
    );
  });

  it("parseBasic passes mixed-mode text through unfiltered", () => {
    const parsed = parseBasic({
      mode: "mixed",
      text: "Hello 123",
    });
    expect(parsed.data).toBe("Hello 123");
  });

  it("produces a shorter payload than byte mode in getEncodedMessage", () => {
    const text = "12345hello価格";
    const mixedBits = encodedPayloadBits(text, MIXED_MODE);
    const byteBits = encodedPayloadBits(text, "byte");
    expect(mixedBits).toBeLessThan(byteBits);
  });

  it("stays shorter than byte mode after version-10 CCI widening", () => {
    const text = "12345hello価格ABC";
    const mixed = getEncodedMessage(
      [{ id: "1", type: "string", mode: MIXED_MODE, data: text, encoding: "utf-8" } as any],
      10,
      0
    );
    const byte = getEncodedMessage(
      [{ id: "1", type: "string", mode: "byte", data: text, encoding: "utf-8" } as any],
      10,
      0
    );
    expect(mixed.error).toBeFalsy();
    expect(byte.error).toBeFalsy();
    expect(payloadBits(mixed.segments, 10)).toBeLessThan(
      payloadBits(byte.segments, 10)
    );
  });
});
