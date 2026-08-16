/**
 * Matrix-aware ISO 15415-style print quality metrics.
 * Samples known module centers from rendered ImageData (no symbol re-detection).
 */

import { getBrightness, type ImageData } from "../image/sampling";
import type { QRMatrix } from "@/domain/shared/types";
import type { IsoGrade, MetricValue, PrintQualityResult } from "./types";

function gradeFromThresholds(
  value: number,
  thresholds: { a: number; b: number; c: number; d: number },
  lowerBetter: boolean
): IsoGrade {
  if (lowerBetter) {
    if (value <= thresholds.a) return "A";
    if (value <= thresholds.b) return "B";
    if (value <= thresholds.c) return "C";
    if (value <= thresholds.d) return "D";
    return "F";
  }
  if (value >= thresholds.a) return "A";
  if (value >= thresholds.b) return "B";
  if (value >= thresholds.c) return "C";
  if (value >= thresholds.d) return "D";
  return "F";
}

function overallGrade(grades: IsoGrade[]): IsoGrade {
  const rank: Record<IsoGrade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  let best: IsoGrade = "A";
  let bestRank = 4;
  for (const g of grades) {
    if (rank[g] < bestRank) {
      bestRank = rank[g];
      best = g;
    }
  }
  return best;
}

function sampleModuleReflectance(
  image: ImageData,
  matrix: QRMatrix,
  quietZone: number
): Float32Array {
  const dimension = matrix.length;
  const total = dimension + quietZone * 2;
  const moduleW = image.width / total;
  const moduleH = image.height / total;
  const out = new Float32Array(dimension * dimension);

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const px = Math.min(
        image.width - 1,
        Math.max(0, Math.floor((x + quietZone + 0.5) * moduleW))
      );
      const py = Math.min(
        image.height - 1,
        Math.max(0, Math.floor((y + quietZone + 0.5) * moduleH))
      );
      const i = (py * image.width + px) * 4;
      out[y * dimension + x] =
        getBrightness(image.data[i], image.data[i + 1], image.data[i + 2]) / 255;
    }
  }
  return out;
}

function metric(
  id: string,
  value: number,
  unit: string,
  direction: "higherBetter" | "lowerBetter",
  grade: IsoGrade
): MetricValue {
  return { id, value, unit, direction, grade };
}

/**
 * Estimate print quality from a rendered image aligned to the known matrix.
 */
export function computePrintQuality(
  image: ImageData,
  matrix: QRMatrix,
  quietZone = 4
): PrintQualityResult {
  const dimension = matrix.length;
  const reflectance = sampleModuleReflectance(image, matrix, quietZone);

  let minR = 1;
  let maxR = 0;
  const darkVals: number[] = [];
  const lightVals: number[] = [];

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const r = reflectance[y * dimension + x];
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (matrix[y][x]?.isDark) darkVals.push(r);
      else lightVals.push(r);
    }
  }

  const symbolContrast = maxR - minR;
  const mean = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const darkMean = mean(darkVals);
  const lightMean = mean(lightVals);
  const modulation =
    symbolContrast > 1e-9
      ? Math.min(1, Math.abs(lightMean - darkMean) / symbolContrast)
      : 0;

  // Fixed pattern: compare finder + timing modules to expected polarity
  let fpErrors = 0;
  let fpCount = 0;
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y][x];
      if (!m?.nonData) continue;
      const expectedDark = !!m.isDark;
      const sampledDark = reflectance[y * dimension + x] < 0.5;
      if (expectedDark !== sampledDark) fpErrors++;
      fpCount++;
    }
  }
  const fixedPatternDamage = fpCount > 0 ? fpErrors / fpCount : 1;

  // Axial: compare row vs column mean absolute deviation of module size proxy
  // (using reflectance transitions along center axes)
  const mid = Math.floor(dimension / 2);
  const rowEdges: number[] = [];
  const colEdges: number[] = [];
  for (let x = 1; x < dimension; x++) {
    if (
      (reflectance[mid * dimension + x] < 0.5) !==
      (reflectance[mid * dimension + x - 1] < 0.5)
    ) {
      rowEdges.push(x);
    }
  }
  for (let y = 1; y < dimension; y++) {
    if (
      (reflectance[y * dimension + mid] < 0.5) !==
      (reflectance[(y - 1) * dimension + mid] < 0.5)
    ) {
      colEdges.push(y);
    }
  }
  const spacingVar = (edges: number[]) => {
    if (edges.length < 2) return 0;
    const diffs = edges.slice(1).map((v, i) => v - edges[i]);
    const m = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    if (m <= 0) return 0;
    const v =
      diffs.reduce((s, d) => s + (d - m) ** 2, 0) / diffs.length / (m * m);
    return v;
  };
  const axialNonuniformity = Math.abs(
    spacingVar(rowEdges) - spacingVar(colEdges)
  );
  const gridNonuniformity =
    (spacingVar(rowEdges) + spacingVar(colEdges)) / 2;

  // Format information: sample known format positions vs matrix
  let formatErrors = 0;
  let formatCount = 0;
  const checkFormat = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= dimension || y >= dimension) return;
    const m = matrix[y][x];
    if (!m) return;
    const expectedDark = !!m.isDark;
    const sampledDark = reflectance[y * dimension + x] < 0.5;
    if (expectedDark !== sampledDark) formatErrors++;
    formatCount++;
  };
  // Around top-left: horizontal y=8, vertical x=8 (standard format loci)
  for (let i = 0; i < 8; i++) {
    if (i === 6) continue; // timing
    checkFormat(i, 8);
    checkFormat(8, i);
  }
  checkFormat(8, 8);
  for (let i = 0; i < 8; i++) {
    checkFormat(dimension - 1 - i, 8);
    checkFormat(8, dimension - 1 - i);
  }
  const formatInformationDamage =
    formatCount > 0 ? formatErrors / formatCount : 1;

  const sc = metric(
    "print.symbolContrast",
    symbolContrast,
    "reflectance",
    "higherBetter",
    gradeFromThresholds(symbolContrast, { a: 0.7, b: 0.55, c: 0.4, d: 0.2 }, false)
  );
  const mod = metric(
    "print.modulation",
    modulation,
    "ratio",
    "higherBetter",
    gradeFromThresholds(modulation, { a: 0.5, b: 0.4, c: 0.3, d: 0.2 }, false)
  );
  const fp = metric(
    "print.fixedPatternDamage",
    fixedPatternDamage,
    "ratio",
    "lowerBetter",
    gradeFromThresholds(fixedPatternDamage, { a: 0.1, b: 0.2, c: 0.3, d: 0.4 }, true)
  );
  const ax = metric(
    "print.axialNonuniformity",
    axialNonuniformity,
    "ratio",
    "lowerBetter",
    gradeFromThresholds(axialNonuniformity, { a: 0.06, b: 0.08, c: 0.1, d: 0.12 }, true)
  );
  const gr = metric(
    "print.gridNonuniformity",
    gridNonuniformity,
    "ratio",
    "lowerBetter",
    gradeFromThresholds(gridNonuniformity, { a: 0.1, b: 0.15, c: 0.2, d: 0.25 }, true)
  );
  const fi = metric(
    "print.formatInformationDamage",
    formatInformationDamage,
    "ratio",
    "lowerBetter",
    gradeFromThresholds(formatInformationDamage, { a: 0.05, b: 0.1, c: 0.15, d: 0.2 }, true)
  );

  return {
    symbolContrast: sc,
    modulation: mod,
    fixedPatternDamage: fp,
    axialNonuniformity: ax,
    gridNonuniformity: gr,
    formatInformationDamage: fi,
    overallGrade: overallGrade([
      sc.grade!,
      mod.grade!,
      fp.grade!,
      ax.grade!,
      gr.grade!,
      fi.grade!,
    ]),
  };
}

/**
 * Recover bit ids whose rendered polarity disagrees with the logical matrix.
 * Used to estimate RS budget consumption of print/halftone/IS-QR renders.
 */
export function recoverFlippedBitIds(
  image: ImageData,
  matrix: QRMatrix,
  quietZone = 4
): string[] {
  const dimension = matrix.length;
  const reflectance = sampleModuleReflectance(image, matrix, quietZone);
  const flipped: string[] = [];

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y][x];
      if (!m || m.nonData) continue;
      const sampledDark = reflectance[y * dimension + x] < 0.5;
      if (sampledDark !== !!m.isDark) {
        const bitId = m.bitId ?? m.bit?.id;
        if (bitId) flipped.push(bitId);
      }
    }
  }
  return flipped;
}
