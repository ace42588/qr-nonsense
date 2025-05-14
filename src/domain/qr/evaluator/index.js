import { estimateAxialNonuniformity, gradeAxialNonuniformity } from "./axial";
import { calculateMinMaxReflectance, gradeSymbolContrast } from "./contrast";
import {
  estimateFixedPatternDamage,
  gradeFixedPatternDamage,
} from "./fixedPattern";
import { estimateFormatInformationDamage, gradeFormatDamage } from "./format";
import { estimateGridNonuniformity, gradeGridNonuniformity } from "./grid";
import { estimateModulation, gradeModulation } from "./modulation";
import { calculateOverallGrade } from "./utils";

export function evaluateQRCodeQuality(canvas) {
  // Get canvas context and image data
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Results object to store all quality metrics
  const results = {
    overallGrade: null,
    metrics: {
      symbolContrast: { value: 0, grade: null },
      modulation: { value: 0, grade: null },
      fixedPatternDamage: { value: 0, grade: null },
      axialNonuniformity: { value: 0, grade: null },
      gridNonuniformity: { value: 0, grade: null },
      formatInformationDamage: { value: 0, grade: null },
    },
  };

  // 1. Calculate Symbol Contrast (SC)
  // Symbol contrast measures the difference between the darkest and lightest elements
  const { minReflectance, maxReflectance } = calculateMinMaxReflectance(data);
  const symbolContrast = maxReflectance - minReflectance;

  results.metrics.symbolContrast.value = symbolContrast;
  results.metrics.symbolContrast.grade = gradeSymbolContrast(symbolContrast);

  // 2. Calculate Modulation
  // This would normally require detecting individual modules and measuring their contrast
  // For simplicity, we're using an estimation method
  const modulation = estimateModulation(data, minReflectance, maxReflectance);

  results.metrics.modulation.value = modulation;
  results.metrics.modulation.grade = gradeModulation(modulation);

  // 3. Estimate Fixed Pattern Damage
  // This requires detecting and analyzing finder patterns and timing patterns
  const fixedPatternDamage = estimateFixedPatternDamage(
    data,
    canvas.width,
    canvas.height
  );

  results.metrics.fixedPatternDamage.value = fixedPatternDamage;
  results.metrics.fixedPatternDamage.grade =
    gradeFixedPatternDamage(fixedPatternDamage);

  // 4. Estimate Axial Nonuniformity
  // This measures how square the QR code is
  const axialNonuniformity = estimateAxialNonuniformity(
    data,
    canvas.width,
    canvas.height
  );

  results.metrics.axialNonuniformity.value = axialNonuniformity;
  results.metrics.axialNonuniformity.grade =
    gradeAxialNonuniformity(axialNonuniformity);

  // 5. Estimate Grid Nonuniformity
  const gridNonuniformity = estimateGridNonuniformity(
    data,
    canvas.width,
    canvas.height
  );

  results.metrics.gridNonuniformity.value = gridNonuniformity;
  results.metrics.gridNonuniformity.grade = gradeGridNonuniformity(gridNonuniformity);

  // 6. Estimate Format Information Damage
  const formatDamage = estimateFormatInformationDamage(
    data,
    canvas.width,
    canvas.height
  );

  results.metrics.formatInformationDamage.value = formatDamage;
  results.metrics.formatInformationDamage.grade =
    gradeFormatDamage(formatDamage);

  // Calculate overall grade (lowest individual grade)
  results.overallGrade = calculateOverallGrade(results.metrics);

  return results;
}
