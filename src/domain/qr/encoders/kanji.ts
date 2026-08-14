import { encodeSegment, createDataSymbol } from "./utils";
import { QREncodeError } from "./errors";
import { packKanji13, unicodeToKanjiShiftJis } from "./shiftJis";

const mode = {
  name: "kanji",
  bits: 0x8,
  thresholds: [
    { max: 32, length: 8 },
    { max: 192, length: 10 },
    { max: Infinity, length: 12 },
  ],
};

function describeChar(char: string): string {
  const cp = char.codePointAt(0) ?? 0;
  return `"${char}" (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`;
}

export function* kanjiIterator(data: string) {
  for (const char of data) {
    const cp = char.codePointAt(0);
    if (cp == null) continue;
    const sjis = unicodeToKanjiShiftJis(cp);
    if (sjis == null) {
      throw new QREncodeError(
        `Character ${describeChar(char)} cannot be encoded in QR Kanji mode`
      );
    }
    yield createDataSymbol(packKanji13(sjis), char, mode.name, 13);
  }
}

export const encodeKanji = (input: string) =>
  encodeSegment(input || "", mode, kanjiIterator);
