import { describe, it, expect } from "vitest";
import { getEncodedMessage, getCodewords, getBlocks } from "../../index";
import { getMatrix } from "../../matrix";
import { getVersionInfo } from "../../versionUtils";
import {
  findMinimalCharacterChangeFlips,
  differingBitIndices,
  selectFlipsAbusingEc,
} from "../index";
import {
  buildBitIdIndex,
  getDamagedReceived,
} from "../../reedsolomon/applyFlips";
import { decodeReedSolomon } from "../../reedsolomon";
import { codewordsToBytes } from "../../../qart/codewordConversion";
import type { Input } from "@/state/inputs/types";

function makeInput(
  data: string,
  mode: string = "byte"
): Input {
  return {
    id: "1",
    type: "string",
    mode,
    data,
    text: data,
    encoding: "utf-8",
  };
}

function buildQr(inputs: Input[], version: number, ecl: number) {
  const encoded = getEncodedMessage(inputs, version, ecl);
  const { codewords, blocks } = getCodewords(
    encoded.segments.map((s) => ({ ...s })),
    encoded.version,
    ecl
  );
  const { matrix } = getMatrix(codewords, 0, encoded.version, ecl);
  const versionInfo = getVersionInfo(ecl, encoded.version);
  return {
    version: encoded.version,
    blocks,
    matrix,
    versionInfo,
  };
}

describe("selectFlipsAbusingEc", () => {
  it("leaves up to t EC diffs unflipped first", () => {
    // data bits 0..15, EC starts at 16
    const diffs = [0, 1, 16, 17, 18, 19];
    const { flipIndices, errorsLeft } = selectFlipsAbusingEc(diffs, 2, 3);
    expect(errorsLeft).toBe(3);
    expect(flipIndices).toHaveLength(3);
    // Prefer omitting EC (16,17,18)
    expect(flipIndices).toEqual([0, 1, 19]);
  });

  it("omits nothing when t is 0", () => {
    const diffs = [0, 1, 2];
    const { flipIndices, errorsLeft } = selectFlipsAbusingEc(diffs, 1, 0);
    expect(errorsLeft).toBe(0);
    expect(flipIndices).toEqual([0, 1, 2]);
  });
});

describe("differingBitIndices", () => {
  it("finds MSB and LSB differences", () => {
    const a = new Uint8ClampedArray([0b10000000, 0b00000001]);
    const b = new Uint8ClampedArray([0b00000000, 0b00000000]);
    expect(differingBitIndices(a, b)).toEqual([0, 15]);
  });
});

describe("findMinimalCharacterChangeFlips", () => {
  it("returns a solution whose flips decode to the mutated data, not the original", () => {
    const inputs = [makeInput("HELLO", "alphanumeric")];
    // ECL H (3) gives more EC → more savings / clearer D−t behavior
    const ecl = 3;
    const { version, blocks, matrix, versionInfo } = buildQr(inputs, 1, ecl);

    const solution = findMinimalCharacterChangeFlips({
      inputs,
      version,
      errorCorrectionLevel: ecl,
      ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      blocks,
      matrix,
    });

    expect(solution).not.toBeNull();
    expect(solution!.fromChar).not.toBe(solution!.toChar);
    expect(solution!.mutatedText).not.toBe(solution!.originalText);
    expect(solution!.flipBitIds.length).toBeGreaterThan(0);
    expect(solution!.flipModuleIds.length).toBe(solution!.flipBitIds.length);
    expect(solution!.flipsSaved).toBe(
      solution!.fullDistance - solution!.flipBitIds.length
    );
    expect(solution!.flipsSaved).toBeGreaterThan(0);

    const t = Math.floor(versionInfo.ecCodewordsPerBlock / 2);
    const touched = solution!.perBlock.filter((b) => b.distance > 0);
    for (const report of touched) {
      expect(report.flips).toBe(report.distance - report.errorsLeft);
      expect(report.errorsLeft).toBeLessThanOrEqual(t);
      expect(report.errorsLeft).toBe(Math.min(t, report.distance));
    }

    const mutatedInputs: Input[] = [
      {
        ...inputs[0],
        data: solution!.mutatedText,
        text: solution!.mutatedText,
      },
    ];
    const targetBlocks = getBlocks(mutatedInputs, version, ecl);
    const bitIndex = buildBitIdIndex(blocks);
    const twoS = versionInfo.ecCodewordsPerBlock;

    for (let i = 0; i < blocks.length; i++) {
      const received = getDamagedReceived(
        blocks[i],
        i,
        solution!.flipBitIds,
        bitIndex
      );
      const result = decodeReedSolomon(received, twoS);
      expect(result.ok).toBe(true);

      const { dataBytes: targetData } = codewordsToBytes(targetBlocks[i]);
      const { dataBytes: origData } = codewordsToBytes(blocks[i]);
      const corrected = result.corrected.subarray(0, targetData.length);

      expect(Array.from(corrected)).toEqual(Array.from(targetData));

      // At least one block should differ from the original payload bytes
      const sameAsOrig = Array.from(corrected).every(
        (b, idx) => b === origData[idx]
      );
      if (!sameAsOrig) {
        // good — mutation landed
      }
    }

    // Overall: some data byte changed vs original
    let anyDataChanged = false;
    for (let i = 0; i < blocks.length; i++) {
      const received = getDamagedReceived(
        blocks[i],
        i,
        solution!.flipBitIds,
        bitIndex
      );
      const result = decodeReedSolomon(received, twoS);
      const { dataBytes: origData } = codewordsToBytes(blocks[i]);
      const corrected = result.corrected.subarray(0, origData.length);
      if (
        Array.from(corrected).some((b, idx) => b !== origData[idx])
      ) {
        anyDataChanged = true;
      }
    }
    expect(anyDataChanged).toBe(true);
  });

  it("abuses EC so flips are fewer than full codeword distance", () => {
    const inputs = [makeInput("TEST", "alphanumeric")];
    const ecl = 2; // Q
    const { version, blocks, matrix, versionInfo } = buildQr(inputs, 1, ecl);

    const solution = findMinimalCharacterChangeFlips({
      inputs,
      version,
      errorCorrectionLevel: ecl,
      ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      blocks,
      matrix,
    });

    expect(solution).not.toBeNull();
    expect(solution!.flipBitIds.length).toBeLessThan(solution!.fullDistance);
    expect(solution!.flipsSaved).toBeGreaterThanOrEqual(
      Math.floor(versionInfo.ecCodewordsPerBlock / 2)
    );
  });

  it("returns null for empty payload", () => {
    const inputs = [makeInput("", "byte")];
    const ecl = 0;
    // Empty may still produce a QR with padding only — solver should find no char mutations
    const encoded = getEncodedMessage(inputs, 1, ecl);
    const { blocks } = getCodewords(
      encoded.segments.map((s) => ({ ...s })),
      encoded.version,
      ecl
    );
    const { matrix } = getMatrix(
      getCodewords(encoded.segments.map((s) => ({ ...s })), encoded.version, ecl)
        .codewords,
      0,
      encoded.version,
      ecl
    );
    const versionInfo = getVersionInfo(ecl, encoded.version);

    const solution = findMinimalCharacterChangeFlips({
      inputs,
      version: encoded.version,
      errorCorrectionLevel: ecl,
      ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      blocks,
      matrix,
    });
    expect(solution).toBeNull();
  });

  it("works for byte-mode printable ASCII", () => {
    const inputs = [makeInput("hi", "byte")];
    const ecl = 1; // L has less EC but still works
    const { version, blocks, matrix, versionInfo } = buildQr(inputs, 1, ecl);

    const solution = findMinimalCharacterChangeFlips({
      inputs,
      version,
      errorCorrectionLevel: ecl,
      ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
      blocks,
      matrix,
      maxAlternativesPerChar: 40,
    });

    expect(solution).not.toBeNull();
    expect(solution!.mutatedText).toHaveLength(2);
    expect(solution!.flipModuleIds.length).toBeGreaterThan(0);
  });
});
