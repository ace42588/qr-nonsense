import { decodeGif, isGifBuffer, type DecodedGif } from "./gif";
import { decodeWebP, isWebPBuffer } from "./webp";

export type DecodedAnimation = DecodedGif;

/**
 * Decode GIF or animated WebP. Returns null for still images (including
 * single-frame GIF/WebP) so callers can use the existing still pipeline.
 */
export async function decodeAnimatedImage(
  buffer: ArrayBuffer | Uint8Array
): Promise<DecodedAnimation | null> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (isGifBuffer(bytes)) {
    const gif = decodeGif(bytes);
    return gif.frames.length > 1 ? gif : null;
  }
  if (isWebPBuffer(bytes)) {
    return decodeWebP(bytes);
  }
  return null;
}
