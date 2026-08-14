import { describe, it, expect } from "vitest";
import { appendDataToSegments } from "../appendData";
import { encodeNumeric } from "../../qr/encoders/numeric";
import { encodeByte } from "../../qr/encoders/byte";
import { getVersionInfo } from "../../qr/versionUtils";
import { getCharCountIndicatorLength } from "../../qr/charCount";
import { QArtAppendData } from "../index";
import { Segment } from "../../shared/types";

function characterCountIndicators(segments: Segment[]) {
  return segments.filter((s) => s.type === "characterCountIndicator");
}

describe("getCharCountIndicatorLength (T5)", () => {
  it("depends only on mode and version, including kanji 8/10/12", () => {
    expect(getCharCountIndicatorLength("numeric", 1)).toBe(10);
    expect(getCharCountIndicatorLength("numeric", 9)).toBe(10);
    expect(getCharCountIndicatorLength("numeric", 10)).toBe(12);
    expect(getCharCountIndicatorLength("numeric", 26)).toBe(12);
    expect(getCharCountIndicatorLength("numeric", 27)).toBe(14);

    expect(getCharCountIndicatorLength("alphanumeric", 1)).toBe(9);
    expect(getCharCountIndicatorLength("alphanumeric", 10)).toBe(11);
    expect(getCharCountIndicatorLength("alphanumeric", 27)).toBe(13);

    expect(getCharCountIndicatorLength("byte", 1)).toBe(8);
    expect(getCharCountIndicatorLength("byte", 9)).toBe(8);
    expect(getCharCountIndicatorLength("byte", 10)).toBe(16);

    expect(getCharCountIndicatorLength("kanji", 1)).toBe(8);
    expect(getCharCountIndicatorLength("kanji", 9)).toBe(8);
    expect(getCharCountIndicatorLength("kanji", 10)).toBe(10);
    expect(getCharCountIndicatorLength("kanji", 26)).toBe(10);
    expect(getCharCountIndicatorLength("kanji", 27)).toBe(12);
  });
});

describe("QArt append CCI widths (T5)", () => {
  it("uses version-only numeric CCI width after appending past the encoder threshold", () => {
    const versionInfo = getVersionInfo(0, 1);
    const segments = encodeNumeric("1");
    const appendConfig: QArtAppendData = {
      enabled: true,
      method: "existing",
    };

    const result = appendDataToSegments(segments, appendConfig, versionInfo);
    const cci = characterCountIndicators(result)[0];

    expect(cci.length).toBe(getCharCountIndicatorLength("numeric", 1));
    expect(cci.length).toBe(10);
    expect(cci.value).toBeGreaterThanOrEqual(10);
  });

  it("keeps numeric CCI at 12 bits on version 10 regardless of character count", () => {
    const versionInfo = getVersionInfo(0, 10);
    const segments = encodeNumeric("1");
    const result = appendDataToSegments(
      segments,
      { enabled: true, method: "existing" },
      versionInfo
    );
    const cci = characterCountIndicators(result)[0];

    expect(cci.length).toBe(12);
    expect(cci.length).toBe(getCharCountIndicatorLength("numeric", 10));
  });

  it("uses 16-bit byte CCI on version 10 even when the appended count is under 256", () => {
    const versionInfo = getVersionInfo(0, 10);
    const segments = encodeByte("A", "utf-8");
    const result = appendDataToSegments(
      segments,
      { enabled: true, method: "new", encodingMode: "byte" },
      versionInfo
    );
    const ccis = characterCountIndicators(result);
    const appendedCci = ccis[ccis.length - 1];

    expect(appendedCci.length).toBe(16);
    expect(appendedCci.value).toBeLessThan(256);
  });

  it("uses 8-bit byte CCI on version 1 even when the appended count is 256 or more", () => {
    const versionInfo = {
      ...getVersionInfo(0, 1),
      requiredDataCodewords: 500,
    };
    const segments = encodeByte("A", "utf-8");
    const result = appendDataToSegments(
      segments,
      { enabled: true, method: "existing" },
      versionInfo
    );
    const cci = characterCountIndicators(result)[0];

    expect(cci.length).toBe(8);
    expect(cci.value).toBeGreaterThanOrEqual(256);
  });

  it("does not change CCI width when only the character count changes on a fixed version", () => {
    const versionInfo = getVersionInfo(0, 5);
    const shortResult = appendDataToSegments(
      encodeNumeric("1"),
      { enabled: true, method: "existing" },
      versionInfo
    );
    const longSeed = encodeNumeric("123456789");
    const longResult = appendDataToSegments(
      longSeed,
      { enabled: true, method: "existing" },
      versionInfo
    );

    expect(characterCountIndicators(shortResult)[0].length).toBe(10);
    expect(characterCountIndicators(longResult)[0].length).toBe(10);
    expect(characterCountIndicators(shortResult)[0].value).not.toBe(
      characterCountIndicators(longResult)[0].value
    );
  });
});
