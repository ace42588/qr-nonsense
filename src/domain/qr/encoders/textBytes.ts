import { QREncodeError } from "./errors";

/**
 * Encode text as UTF-8 bytes (whole string, one array element per byte).
 */
export function encodeUtf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Encode text as ISO-8859-1 / Latin-1: one byte per code unit 0–255.
 * Code points above 255 cannot be represented.
 */
export function encodeLatin1Bytes(
  text: string,
  charsetLabel = "ISO-8859-1"
): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 255) {
      throw new QREncodeError(
        `Character "${text[i]}" cannot be encoded as ${charsetLabel}`
      );
    }
    bytes[i] = code;
  }
  return bytes;
}
