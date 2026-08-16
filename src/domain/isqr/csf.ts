/**
 * Contrast Sensitivity Function (Mannos–Sakrison) for HVS-aware DWT weighting.
 */

import { haarForward2D, haarInverse2D, extractLuma, applyLumaToImageData } from "./dwt";

/**
 * Mannos–Sakrison CSF:
 * CSF(f) = 2.6 * (0.0192 + 0.114*f) * exp(-(0.114*f)^1.1)
 * f in cycles/degree.
 */
export function mannosSakrisonCsf(f: number): number {
  const freq = Math.max(0, f);
  return 2.6 * (0.0192 + 0.114 * freq) * Math.exp(-Math.pow(0.114 * freq, 1.1));
}

export interface CsfOptions {
  /** Print resolution in DPI (default 300) */
  printDpi?: number;
  /** Viewing distance in inches (default 12) */
  viewingDistanceInches?: number;
  /**
   * Strength of CSF reweighting on detail bands [0, 1].
   * 0 = identity; 1 = full CSF-relative scaling of LH/HL/HH.
   */
  strength?: number;
}

/**
 * Map a wavelet subband to approximate cycles/degree given print DPI and viewing distance.
 * Nyquist at pixel pitch ≈ dpi / (2 * viewingDistance * π/180 * 180/π) simplified:
 * cycles/deg ≈ (cycles/pixel) * (pixels/inch) * (inches / degree)
 * inches/degree ≈ viewingDistance * tan(1°) ≈ viewingDistance * π/180
 */
export function subbandFrequencyCpd(
  cyclesPerPixel: number,
  printDpi: number,
  viewingDistanceInches: number
): number {
  const inchesPerDegree = viewingDistanceInches * (Math.PI / 180);
  return cyclesPerPixel * printDpi * inchesPerDegree;
}

/**
 * Apply Haar DWT + CSF reweighting to ImageData luminance.
 * Boosts mid-frequency QR structure relative to high-frequency noise for print/scan.
 */
export function applyDwtCsf(
  imageData: ImageData,
  options: CsfOptions = {}
): ImageData {
  const printDpi = options.printDpi ?? 300;
  const viewingDistanceInches = options.viewingDistanceInches ?? 12;
  const strength = Math.max(0, Math.min(1, options.strength ?? 0.5));

  if (strength === 0) return imageData;

  const { width, height } = imageData;
  if (width < 2 || height < 2) return imageData;

  const luma = extractLuma(imageData);
  const bands = haarForward2D(luma, width, height);

  // Approximate center frequencies (cycles/pixel) for LH/HL (~0.25) and HH (~0.35)
  const fLh = subbandFrequencyCpd(0.25, printDpi, viewingDistanceInches);
  const fHl = fLh;
  const fHh = subbandFrequencyCpd(0.353, printDpi, viewingDistanceInches);
  const fLl = subbandFrequencyCpd(0.125, printDpi, viewingDistanceInches);

  const csfLl = mannosSakrisonCsf(fLl);
  const csfLh = mannosSakrisonCsf(fLh);
  const csfHl = mannosSakrisonCsf(fHl);
  const csfHh = mannosSakrisonCsf(fHh);
  const ref = Math.max(csfLl, 1e-6);

  // Relative gains: preserve LL; scale detail toward CSF/ref so HVS-sensitive bands keep energy
  const gainLh = 1 + strength * (csfLh / ref - 1);
  const gainHl = 1 + strength * (csfHl / ref - 1);
  const gainHh = 1 + strength * (csfHh / ref - 1);

  for (let i = 0; i < bands.lh.length; i++) {
    bands.lh[i] *= gainLh;
    bands.hl[i] *= gainHl;
    bands.hh[i] *= gainHh;
  }

  const reconstructed = haarInverse2D(bands, width, height);
  return applyLumaToImageData(imageData, reconstructed);
}
