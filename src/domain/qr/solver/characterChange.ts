/**
 * Find a length-preserving one-character payload mutation that minimizes
 * module flips, abusing RS capacity by leaving up to t bit errors per block
 * relative to the target codeword (so scanners still decode the mutation).
 */

import { Input } from "@/state/inputs/types";
import { QRMatrix } from "@/domain/shared/types";
import { getBlocks } from "@/domain/qr";
import { QRBlock } from "@/domain/qr/codewords/blocks";
import { codewordsToBytes } from "@/domain/qart/codewordConversion";
import {
  buildBitIdIndex,
  getBlockBitIds,
  getDamagedReceived,
} from "@/domain/qr/reedsolomon/applyFlips";
import { decodeReedSolomon } from "@/domain/qr/reedsolomon";
import { ALPHANUMERIC_CHARSET } from "@/domain/qr/encoders/alphanumeric";

const textEncoder = new TextEncoder();

export interface BlockFlipReport {
  blockIndex: number;
  /** Hamming distance between original and target codewords (bits). */
  distance: number;
  /** Bits actually flipped toward the target. */
  flips: number;
  /** Differing bits left as correctable errors (≤ t). */
  errorsLeft: number;
}

export interface CharacterChangeSolution {
  inputIndex: number;
  charIndex: number;
  fromChar: string;
  toChar: string;
  originalText: string;
  mutatedText: string;
  /** Full concatenated payload after mutation (all inputs). */
  mutatedPayload: string;
  flipBitIds: string[];
  flipModuleIds: string[];
  /** Sum of per-block distances (full re-encode flip count). */
  fullDistance: number;
  /** fullDistance - flipBitIds.length */
  flipsSaved: number;
  perBlock: BlockFlipReport[];
}

export interface CharacterChangeSolverOptions {
  inputs: Input[];
  version: number;
  errorCorrectionLevel: number;
  ecCodewordsPerBlock: number;
  blocks: QRBlock[];
  matrix: QRMatrix;
  /**
   * Optional cap on alternatives tried per character (after skipping self).
   * Applied after alphabet ordering; useful for byte-mode search cost.
   */
  maxAlternativesPerChar?: number;
}

interface MutationCandidate {
  inputIndex: number;
  charIndex: number;
  fromChar: string;
  toChar: string;
  originalInputText: string;
  mutatedInputText: string;
  mutatedInputs: Input[];
  mutatedPayload: string;
}

function utf8ByteLength(s: string): number {
  return textEncoder.encode(s).length;
}

function payloadFromInputs(inputs: Input[]): string {
  return inputs.map((i) => i.data ?? i.text ?? "").join("");
}

function alphabetForMode(mode: string, fromChar?: string): string[] {
  let chars: string[];
  switch (mode) {
    case "numeric":
      chars = [..."0123456789"];
      break;
    case "alphanumeric":
      chars = [...ALPHANUMERIC_CHARSET];
      break;
    case "byte":
    case "mixed":
    case "auto":
    case "optimized":
    case "eci": {
      // Printable ASCII + Latin-1 supplement (same UTF-8 byte length for
      // code points U+0000–U+00FF when replacing a single Latin-1 char).
      chars = [];
      for (let cp = 0x20; cp <= 0x7e; cp++) {
        chars.push(String.fromCharCode(cp));
      }
      for (let cp = 0xa0; cp <= 0xff; cp++) {
        chars.push(String.fromCharCode(cp));
      }
      break;
    }
    default:
      chars = [...ALPHANUMERIC_CHARSET, ..."0123456789"];
  }

  // Prefer nearby code points so capped searches still find cheap bit flips.
  if (fromChar != null && fromChar.length > 0) {
    const fromCp = fromChar.codePointAt(0) ?? 0;
    chars = [...chars].sort(
      (a, b) =>
        Math.abs((a.codePointAt(0) ?? 0) - fromCp) -
        Math.abs((b.codePointAt(0) ?? 0) - fromCp)
    );
  }
  return chars;
}

function isMutableInput(input: Input): boolean {
  const mode = input.mode;
  if (!mode) return false;
  if (mode === "kanji" || mode === "kanjiMode") return false;
  if (input.encoding === "hex" || input.encoding === "binary") return false;
  const text = input.data ?? input.text ?? "";
  return text.length > 0;
}

function* iterateMutations(
  inputs: Input[],
  maxAlternativesPerChar?: number
): Generator<MutationCandidate> {
  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    const input = inputs[inputIndex];
    if (!isMutableInput(input)) continue;

    const originalInputText = input.data ?? input.text ?? "";
    const chars = [...originalInputText];
    if (chars.length === 0) continue;

    // Alphabet is re-sorted per character for cheaper capped byte searches.

    for (let charIndex = 0; charIndex < chars.length; charIndex++) {
      const fromChar = chars[charIndex];
      const fromLen = utf8ByteLength(fromChar);
      const alphabet = alphabetForMode(input.mode, fromChar);
      let tried = 0;

      for (const toChar of alphabet) {
        if (toChar === fromChar) continue;
        if (utf8ByteLength(toChar) !== fromLen) continue;
        if (
          maxAlternativesPerChar != null &&
          tried >= maxAlternativesPerChar
        ) {
          break;
        }
        tried += 1;

        const nextChars = chars.slice();
        nextChars[charIndex] = toChar;
        const mutatedInputText = nextChars.join("");

        const mutatedInputs = inputs.map((inp, idx) => {
          if (idx !== inputIndex) return inp;
          return {
            ...inp,
            data: mutatedInputText,
            text: mutatedInputText,
          };
        });

        yield {
          inputIndex,
          charIndex,
          fromChar,
          toChar,
          originalInputText,
          mutatedInputText,
          mutatedInputs,
          mutatedPayload: payloadFromInputs(mutatedInputs),
        };
      }
    }
  }
}

function concatBlockBytes(block: QRBlock): Uint8ClampedArray {
  const { dataBytes, ecBytes } = codewordsToBytes(block);
  const out = new Uint8ClampedArray(dataBytes.length + ecBytes.length);
  out.set(dataBytes, 0);
  out.set(ecBytes, dataBytes.length);
  return out;
}

/**
 * Differing bit indices (0 = MSB of byte 0) between two equal-length byte arrays.
 */
export function differingBitIndices(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray
): number[] {
  const diffs: number[] = [];
  const n = Math.min(a.length, b.length);
  for (let byteIndex = 0; byteIndex < n; byteIndex++) {
    const x = a[byteIndex] ^ b[byteIndex];
    if (x === 0) continue;
    for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
      const mask = 1 << (7 - bitIndex);
      if (x & mask) {
        diffs.push(byteIndex * 8 + bitIndex);
      }
    }
  }
  return diffs;
}

/**
 * Choose which differing bits to flip: leave up to `t` as errors, preferring
 * to leave EC-region differences unflipped (abuse parity capacity first).
 */
export function selectFlipsAbusingEc(
  diffBitIndices: number[],
  dataByteCount: number,
  t: number
): { flipIndices: number[]; errorsLeft: number } {
  if (diffBitIndices.length === 0) {
    return { flipIndices: [], errorsLeft: 0 };
  }

  const dataBitCount = dataByteCount * 8;
  const dataDiffs: number[] = [];
  const ecDiffs: number[] = [];
  for (const idx of diffBitIndices) {
    if (idx < dataBitCount) dataDiffs.push(idx);
    else ecDiffs.push(idx);
  }

  const omitBudget = Math.min(t, diffBitIndices.length);
  const omit = new Set<number>();

  for (const idx of ecDiffs) {
    if (omit.size >= omitBudget) break;
    omit.add(idx);
  }
  for (const idx of dataDiffs) {
    if (omit.size >= omitBudget) break;
    omit.add(idx);
  }

  const flipIndices = diffBitIndices.filter((idx) => !omit.has(idx));
  return { flipIndices, errorsLeft: omit.size };
}

function bitIdsToModuleIds(matrix: QRMatrix, bitIds: string[]): string[] {
  const moduleIds: string[] = [];
  const seen = new Set<string>();
  for (const bitId of bitIds) {
    const mod = matrix.getModuleByBitId?.(bitId);
    if (!mod?.id || seen.has(mod.id)) continue;
    seen.add(mod.id);
    moduleIds.push(mod.id);
  }
  return moduleIds;
}

function verifyFlipsDecodeToTarget(
  originalBlocks: QRBlock[],
  targetBlocks: QRBlock[],
  flipBitIds: string[],
  twoS: number
): boolean {
  const bitIndex = buildBitIdIndex(originalBlocks);

  for (let blockIndex = 0; blockIndex < originalBlocks.length; blockIndex++) {
    const orig = originalBlocks[blockIndex];
    const target = targetBlocks[blockIndex];
    const { dataBytes: targetData } = codewordsToBytes(target);
    const received = getDamagedReceived(
      orig,
      blockIndex,
      flipBitIds,
      bitIndex
    );
    const result = decodeReedSolomon(received, twoS);
    if (!result.ok) return false;

    const correctedData = result.corrected.subarray(0, targetData.length);
    for (let i = 0; i < targetData.length; i++) {
      if (correctedData[i] !== targetData[i]) return false;
    }
  }
  return true;
}

function scoreCandidate(
  originalBlocks: QRBlock[],
  targetBlocks: QRBlock[],
  t: number,
  twoS: number,
  matrix: QRMatrix
): Omit<
  CharacterChangeSolution,
  | "inputIndex"
  | "charIndex"
  | "fromChar"
  | "toChar"
  | "originalText"
  | "mutatedText"
  | "mutatedPayload"
> | null {
  if (originalBlocks.length !== targetBlocks.length) return null;

  const flipBitIds: string[] = [];
  const perBlock: BlockFlipReport[] = [];
  let fullDistance = 0;

  for (let blockIndex = 0; blockIndex < originalBlocks.length; blockIndex++) {
    const orig = originalBlocks[blockIndex];
    const target = targetBlocks[blockIndex];
    if (orig.data.length !== target.data.length) return null;
    if (orig.errorCorrection.length !== target.errorCorrection.length) {
      return null;
    }

    const origBytes = concatBlockBytes(orig);
    const targetBytes = concatBlockBytes(target);
    const diffs = differingBitIndices(origBytes, targetBytes);
    const D = diffs.length;
    fullDistance += D;

    if (D === 0) {
      perBlock.push({
        blockIndex,
        distance: 0,
        flips: 0,
        errorsLeft: 0,
      });
      continue;
    }

    const { flipIndices, errorsLeft } = selectFlipsAbusingEc(
      diffs,
      orig.data.length,
      t
    );
    const blockBitIds = getBlockBitIds(orig);
    for (const bitPos of flipIndices) {
      const bitId = blockBitIds[bitPos];
      if (bitId) flipBitIds.push(bitId);
    }

    perBlock.push({
      blockIndex,
      distance: D,
      flips: flipIndices.length,
      errorsLeft,
    });
  }

  if (fullDistance === 0) return null;

  if (!verifyFlipsDecodeToTarget(originalBlocks, targetBlocks, flipBitIds, twoS)) {
    return null;
  }

  return {
    flipBitIds,
    flipModuleIds: bitIdsToModuleIds(matrix, flipBitIds),
    fullDistance,
    flipsSaved: fullDistance - flipBitIds.length,
    perBlock,
  };
}

/**
 * Search length-preserving one-character mutations and return the one that
 * needs the fewest module flips when RS capacity is abused (D−t per block).
 */
export function findMinimalCharacterChangeFlips(
  options: CharacterChangeSolverOptions
): CharacterChangeSolution | null {
  const ranked = enumerateCharacterChangeCandidates(options, 1);
  return ranked[0] ?? null;
}

/**
 * Enumerate length-preserving one-character mutations, scored by EC-abused
 * flip count, returning up to `limit` best candidates (ascending flips).
 */
export function enumerateCharacterChangeCandidates(
  options: CharacterChangeSolverOptions,
  limit: number = 20
): CharacterChangeSolution[] {
  const {
    inputs,
    version,
    errorCorrectionLevel,
    ecCodewordsPerBlock,
    blocks,
    matrix,
    maxAlternativesPerChar,
  } = options;

  if (!blocks?.length || !matrix?.length || version < 1 || limit < 1) {
    return [];
  }

  const t = Math.floor(ecCodewordsPerBlock / 2);
  const twoS = ecCodewordsPerBlock;
  const originalPayload = payloadFromInputs(inputs);
  const found: CharacterChangeSolution[] = [];

  for (const mutation of iterateMutations(inputs, maxAlternativesPerChar)) {
    let targetBlocks: QRBlock[];
    try {
      targetBlocks = getBlocks(
        mutation.mutatedInputs,
        version,
        errorCorrectionLevel
      );
    } catch {
      continue;
    }

    if (!targetBlocks?.length) continue;

    const scored = scoreCandidate(blocks, targetBlocks, t, twoS, matrix);
    if (!scored) continue;

    found.push({
      inputIndex: mutation.inputIndex,
      charIndex: mutation.charIndex,
      fromChar: mutation.fromChar,
      toChar: mutation.toChar,
      originalText: mutation.originalInputText,
      mutatedText: mutation.mutatedInputText,
      mutatedPayload: mutation.mutatedPayload || originalPayload,
      ...scored,
    });
  }

  found.sort((a, b) => {
    if (a.flipModuleIds.length !== b.flipModuleIds.length) {
      return a.flipModuleIds.length - b.flipModuleIds.length;
    }
    if (a.fullDistance !== b.fullDistance) {
      return a.fullDistance - b.fullDistance;
    }
    if (a.charIndex !== b.charIndex) return a.charIndex - b.charIndex;
    return a.toChar < b.toChar ? -1 : a.toChar > b.toChar ? 1 : 0;
  });

  return found.slice(0, limit);
}
