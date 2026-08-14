import { QRQArt } from "./QRQArt";

/**
 * Combined QArt + Halftone view (spec 005).
 * Generates a QArt-optimized matrix first, then always applies halftone
 * patterns whose module centers match the QArt bit values.
 */
export function QRCombined(props) {
  return <QRQArt combined {...props} />;
}
