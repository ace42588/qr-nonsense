import { describe, it, expect } from "vitest";
import { createInput } from "@/state/inputs/inputFactory";
import { encodePair } from "@/domain/dual";
import { countAgreement } from "@/domain/ambiguous";
import { parseAll } from "@/domain/input";
import { getEncodedMessage, getCodewords } from "@/domain/qr";
import { getMatrix } from "@/domain/qr/matrix";

function stringInput(text: string) {
  return createInput({ type: "string", label: "s", text, data: text, mode: "byte" });
}

describe("identical Hello world payloads", () => {
  it("codeword bit values match for identical text", () => {
    const a = stringInput("Hello world");
    const b = stringInput("Hello world");
    const encA = getEncodedMessage(parseAll([a]), -1, 0);
    const encB = getEncodedMessage(parseAll([b]), -1, 0);
    const segsA = encA.segments.map((s) => ({ ...s }));
    const segsB = encB.segments.map((s) => ({ ...s }));
    const { codewords: cwA } = getCodewords(segsA, encA.version, 0);
    const { codewords: cwB } = getCodewords(segsB, encB.version, 0);
    const bitsA = cwA.flatMap((c) => c.bits.map((bit) => bit.value));
    const bitsB = cwB.flatMap((c) => c.bits.map((bit) => bit.value));
    expect(bitsA).toEqual(bitsB);
    expect(encA.version).toBe(encB.version);
  });

  it("getMatrix same codewords twice with explicit mask agree", () => {
    const a = stringInput("Hello world");
    const enc = getEncodedMessage(parseAll([a]), -1, 0);
    const segs = enc.segments.map((s) => ({ ...s }));
    const { codewords } = getCodewords(segs, enc.version, 0);
    const m1 = getMatrix(codewords, 5, enc.version, 0);
    const m2 = getMatrix(codewords, 5, enc.version, 0);
    const stats = countAgreement(m1.matrix, m2.matrix);
    expect(stats.disagreeCount).toBe(0);
  });

  it("getMatrix auto then explicit shared mask from separate codeword copies", () => {
    const text = "Hello world";
    const encA = getEncodedMessage(parseAll([stringInput(text)]), -1, 0);
    const encB = getEncodedMessage(parseAll([stringInput(text)]), -1, 0);
    const { codewords: cwA } = getCodewords(
      encA.segments.map((s) => ({ ...s })),
      encA.version,
      0
    );
    const auto = getMatrix(cwA, -1, encA.version, 0);
    const { codewords: cwB } = getCodewords(
      encB.segments.map((s) => ({ ...s })),
      encB.version,
      0
    );
    const forced = getMatrix(cwB, auto.dataMask, encB.version, 0);
    const stats = countAgreement(auto.matrix, forced.matrix);
    expect(stats.disagreeCount).toBe(0);
  });

  it("should fully agree with auto version/mask", () => {
    const result = encodePair({
      inputsA: [stringInput("Hello world")],
      inputsB: [stringInput("Hello world")],
      version: -1,
      errorCorrectionLevel: 0,
      dataMask: -1,
    });
    expect(result.matrixA).toBeTruthy();
    expect(result.matrixB).toBeTruthy();
    const stats = countAgreement(result.matrixA!, result.matrixB!);
    expect(stats.disagreeCount).toBe(0);
  });
});
