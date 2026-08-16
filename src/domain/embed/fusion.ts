/**
 * Soft dual-payload embed fusion: outer leans toward Payload A polarity,
 * center seed leans toward Payload B — inspired by IS-QR fuseColorQr.
 */

import type { QRMatrix } from "@/domain/shared/types";
import { applyDwtCsf, type CsfOptions } from "@/domain/isqr/csf";

export interface EmbedFusionOptions {
  /** Sub-pixels per module edge (default 9 for smooth soft edges). */
  modulePixel?: number;
  /**
   * Center "dot" size as a fraction of the module side (0.15–1).
   * Matches IS-QR centerSeed semantics: region around module center owned by B.
   */
  centerSeed?: number;
  /** How strongly to push A/B polarities vs mid-gray (0–1, default 0.9). */
  polarityStrength?: number;
  /** Optional Mannos–Sakrison DWT/CSF post-process. */
  csf?: CsfOptions;
}

function clampByte(v: number): number {
  return Math.round(Math.max(0, Math.min(255, v)));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Fuse matrixA (outer) and matrixB (center) into a grayscale ImageData.
 * Structural (nonData) modules stay solid A. Agreeing modules stay solid.
 */
export function fuseEmbedPair(
  matrixA: QRMatrix,
  matrixB: QRMatrix,
  options: EmbedFusionOptions = {}
): ImageData {
  const dimension = matrixA.length;
  const modulePixel = Math.max(3, options.modulePixel ?? 9);
  const centerSeed = Math.max(0.15, Math.min(1, options.centerSeed ?? 0.35));
  const polarityStrength = Math.max(0, Math.min(1, options.polarityStrength ?? 0.9));
  const size = dimension * modulePixel;
  const out = new ImageData(size, size);
  const dst = out.data;

  // Soft transition: fully B near center, fully A outside centerSeed radius
  const inner = (centerSeed / 2) * 0.55;
  const outer = centerSeed / 2;

  for (let my = 0; my < dimension; my++) {
    for (let mx = 0; mx < dimension; mx++) {
      const a = matrixA[my]?.[mx];
      const b = matrixB[my]?.[mx];
      if (!a) continue;

      const aDark = !!a.isDark;
      const bDark = !!b?.isDark;
      const isStructural = !!a.nonData;
      const aPol = aDark ? 0 : 255;
      const bPol = bDark ? 0 : 255;

      for (let py = 0; py < modulePixel; py++) {
        for (let px = 0; px < modulePixel; px++) {
          const cx = (px + 0.5) / modulePixel;
          const cy = (py + 0.5) / modulePixel;
          const dx = cx - 0.5;
          const dy = cy - 0.5;
          // Circular soft "dot"
          const dist = Math.sqrt(dx * dx + dy * dy);

          let value: number;
          if (isStructural || aDark === bDark) {
            value = aPol;
          } else {
            // 1 at center (B), 0 outside (A)
            const wB = 1 - smoothstep(inner, outer, dist);
            const target = aPol * (1 - wB) + bPol * wB;
            // Pull from mid-gray so disagreements are less harsh than pure B/W
            const base = 128;
            value = base * (1 - polarityStrength) + target * polarityStrength;
          }

          const ox = mx * modulePixel + px;
          const oy = my * modulePixel + py;
          const oi = (oy * size + ox) * 4;
          const v = clampByte(value);
          dst[oi] = v;
          dst[oi + 1] = v;
          dst[oi + 2] = v;
          dst[oi + 3] = 255;
        }
      }
    }
  }

  return out;
}

/** Fuse then optionally apply DWT/CSF to reduce high-frequency center speckles. */
export function fuseEmbedPairWithCsf(
  matrixA: QRMatrix,
  matrixB: QRMatrix,
  options: EmbedFusionOptions = {}
): ImageData {
  const fused = fuseEmbedPair(matrixA, matrixB, options);
  if (!options.csf || (options.csf.strength ?? 0.5) === 0) {
    return fused;
  }
  return applyDwtCsf(fused, options.csf);
}
