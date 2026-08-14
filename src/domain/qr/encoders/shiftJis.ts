import { QREncodeError } from "./errors";

/**
 * Unicode code point → Shift JIS code (1 byte 0x00–0xFF, or 2-byte 0x8140+).
 * Built by reversing the platform Shift_JIS decoder over the QR Kanji ranges
 * plus ASCII and halfwidth katakana (for ECI 20).
 */
let unicodeToSjis: Map<number, number> | null = null;

function isReplacement(decoded: string): boolean {
  return !decoded || decoded.length !== 1 || decoded === "\uFFFD";
}

function addDecoded(
  map: Map<number, number>,
  bytes: Uint8Array,
  sjis: number,
  decoder: TextDecoder
) {
  const decoded = decoder.decode(bytes);
  if (isReplacement(decoded)) return;
  const cp = decoded.codePointAt(0);
  if (cp == null || map.has(cp)) return;
  map.set(cp, sjis);
}

function buildUnicodeToSjisMap(): Map<number, number> {
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder("shift_jis");
  } catch {
    throw new QREncodeError(
      "Shift JIS is not available in this environment; cannot encode Kanji/ECI 20"
    );
  }

  const map = new Map<number, number>();

  for (let b = 0x00; b <= 0x7f; b++) {
    map.set(b, b);
  }

  for (let b = 0xa1; b <= 0xdf; b++) {
    addDecoded(map, new Uint8Array([b]), b, decoder);
  }

  for (let high = 0x81; high <= 0x9f; high++) {
    for (let low = 0x40; low <= 0xfc; low++) {
      if (low === 0x7f) continue;
      const sjis = (high << 8) | low;
      if (sjis > 0x9ffc) continue;
      addDecoded(map, new Uint8Array([high, low]), sjis, decoder);
    }
  }

  for (let high = 0xe0; high <= 0xeb; high++) {
    const maxLow = high === 0xeb ? 0xbf : 0xfc;
    for (let low = 0x40; low <= maxLow; low++) {
      if (low === 0x7f) continue;
      const sjis = (high << 8) | low;
      addDecoded(map, new Uint8Array([high, low]), sjis, decoder);
    }
  }

  return map;
}

export function getUnicodeToSjisMap(): Map<number, number> {
  if (!unicodeToSjis) {
    unicodeToSjis = buildUnicodeToSjisMap();
  }
  return unicodeToSjis;
}

export function isKanjiShiftJisRange(sjis: number): boolean {
  const low = sjis & 0xff;
  if (low < 0x40 || low > 0xfc || low === 0x7f) return false;
  return (
    (sjis >= 0x8140 && sjis <= 0x9ffc) || (sjis >= 0xe040 && sjis <= 0xebbf)
  );
}

/**
 * Pack a Shift JIS double-byte character into the 13-bit Kanji-mode value
 * per ISO/IEC 18004.
 */
export function packKanji13(sjis: number): number {
  let subtracted: number;
  if (sjis >= 0x8140 && sjis <= 0x9ffc) {
    subtracted = sjis - 0x8140;
  } else if (sjis >= 0xe040 && sjis <= 0xebbf) {
    subtracted = sjis - 0xc140;
  } else {
    throw new QREncodeError(
      `Shift JIS 0x${sjis.toString(16).toUpperCase()} is not in the QR Kanji range`
    );
  }
  return (subtracted >> 8) * 0xc0 + (subtracted & 0xff);
}

export function unicodeToKanjiShiftJis(codePoint: number): number | null {
  const sjis = getUnicodeToSjisMap().get(codePoint);
  if (sjis == null || !isKanjiShiftJisRange(sjis)) return null;
  return sjis;
}

export function stringToShiftJisBytes(text: string): Uint8Array {
  const map = getUnicodeToSjisMap();
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp == null) continue;
    const sjis = map.get(cp);
    if (sjis == null) {
      throw new QREncodeError(
        `Character "${char}" (U+${cp.toString(16).toUpperCase()}) cannot be encoded in Shift JIS`
      );
    }
    if (sjis <= 0xff) {
      bytes.push(sjis);
    } else {
      bytes.push((sjis >> 8) & 0xff, sjis & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}
