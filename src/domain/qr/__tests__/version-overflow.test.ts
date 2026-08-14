import { describe, it, expect } from "vitest";
import { getEncodedMessage, getCodewords } from "../index";
import { addPadding, getNumBits } from "../encoders/utils";
import { encodeByte } from "../encoders/byte";
import { getMatrix } from "../matrix";

describe("fixed-version overflow (T16)", () => {
  const oversized = {
    id: "1",
    type: "string" as const,
    mode: "byte",
    data: "x".repeat(20),
    encoding: "utf-8",
  };

  it("still encodes over-capacity data on a fixed version and flags it invalid", () => {
    const result = getEncodedMessage([oversized], 1, 0);
    expect(result.invalid).toBe(true);
    expect(result.invalidReason).toMatch(/does not fit|capacity/i);
    expect(result.error).toBeFalsy();
    expect(result.version).toBe(1);
    expect(result.segments.some((s) => s.type === "data")).toBe(true);
  });

  it("still auto-selects a larger version for the same payload", () => {
    const result = getEncodedMessage([oversized], -1, 0);
    expect(result.error).toBeFalsy();
    expect(result.invalid).toBeFalsy();
    expect(result.version).toBeGreaterThan(1);
    expect(result.segments.some((s) => s.type === "data")).toBe(true);
  });

  it("still produces a matrix for an over-capacity fixed version", () => {
    const encoded = getEncodedMessage([oversized], 1, 0);
    const { codewords } = getCodewords(encoded.segments, encoded.version, 0);
    const { matrix } = getMatrix(codewords, -1, encoded.version, 0);
    expect(matrix.length).toBe(21);
  });

  it("addPadding leaves oversized segments unchanged instead of throwing", () => {
    const segments = encodeByte("x".repeat(20), "utf-8");
    const padded = addPadding(segments, 1);
    expect(padded).toEqual(segments);
    expect(getNumBits(padded)).toBe(getNumBits(segments));
  });
});
