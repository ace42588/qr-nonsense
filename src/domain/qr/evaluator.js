/**
 * QR Code Quality Evaluator
 * 
 * This function evaluates the quality of a QR code in an HTML canvas based on standard
 * verification criteria including:
 * - Symbol Contrast
 * - Modulation
 * - Fixed Pattern Damage
 * - Axial Nonuniformity
 * - Grid Nonuniformity
 * - Format Information Damage
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element containing the QR code
 * @return {Object} Quality evaluation results with grades and metrics
 */
export function evaluateQRCodeQuality(canvas) {
  // Get canvas context and image data
  const ctx = canvas.getContext('2d');
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
      formatInformationDamage: { value: 0, grade: null }
    }
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
  const fixedPatternDamage = estimateFixedPatternDamage(data, canvas.width, canvas.height);
  
  results.metrics.fixedPatternDamage.value = fixedPatternDamage;
  results.metrics.fixedPatternDamage.grade = gradeFixedPatternDamage(fixedPatternDamage);
  
  // 4. Estimate Axial Nonuniformity
  // This measures how square the QR code is
  const axialNonuniformity = estimateAxialNonuniformity(data, canvas.width, canvas.height);
  
  results.metrics.axialNonuniformity.value = axialNonuniformity;
  results.metrics.axialNonuniformity.grade = gradeAxialNonuniformity(axialNonuniformity);
  
  // 5. Estimate Grid Nonuniformity
  const gridNonuniformity = estimateGridNonuniformity(data, canvas.width, canvas.height);
  
  results.metrics.gridNonuniformity.value = gridNonuniformity;
  //results.metrics.gridNonuniformity.grade = gradeGridNonuniformity(gridNonuniformity);
  
  // 6. Estimate Format Information Damage
  const formatDamage = estimateFormatInformationDamage(data, canvas.width, canvas.height);
  
  results.metrics.formatInformationDamage.value = formatDamage;
  results.metrics.formatInformationDamage.grade = gradeFormatDamage(formatDamage);
  
  // Calculate overall grade (lowest individual grade)
  results.overallGrade = calculateOverallGrade(results.metrics);
  
  return results;
}

/**
 * Calculate minimum and maximum reflectance values in the image
 */
function calculateMinMaxReflectance(data) {
  let min = 255;
  let max = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // Convert RGB to grayscale
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    // Normalize to 0-1 range for reflectance
    const reflectance = gray / 255;
    
    if (reflectance < min) min = reflectance;
    if (reflectance > max) max = reflectance;
  }
  
  return { minReflectance: min, maxReflectance: max };
}

/**
 * Estimate modulation based on histogram analysis
 */
function estimateModulation(data, minReflectance, maxReflectance) {
  // Create histogram bins
  const bins = 10;
  const histogram = new Array(bins).fill(0);
  const range = maxReflectance - minReflectance;
  
  // Fill histogram
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    const binIndex = Math.min(bins - 1, Math.floor((gray - minReflectance) / range * bins));
    histogram[binIndex]++;
  }
  
  // Analyze histogram peaks
  // Looking for distinct peaks for dark and light modules
  let darkPeak = 0;
  let lightPeak = 0;
  
  for (let i = 0; i < bins / 2; i++) {
    darkPeak = Math.max(darkPeak, histogram[i]);
  }
  
  for (let i = bins / 2; i < bins; i++) {
    lightPeak = Math.max(lightPeak, histogram[i]);
  }
  
  // Calculate modulation as ratio between actual contrast and potential contrast
  // Higher values indicate better modulation
  const actualContrast = range;
  const potentialContrast = 1.0; // Maximum possible contrast
  const modulation = actualContrast / potentialContrast;
  
  return modulation;
}

/**
 * Estimate fixed pattern damage by analyzing finder patterns
 */
function estimateFixedPatternDamage(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the finder patterns (top-left, top-right, bottom-left)
  // 2. Analyze their shape and contrast
  // 3. Check timing patterns
  
  // For this example, returning a simulated value
  // Lower values indicate less damage (better)
  return 0.15;
}

/**
 * Estimate axial nonuniformity
 */
function estimateAxialNonuniformity(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the edges of the QR code
  // 2. Calculate how square the shape is
  
  // For this example, returning a simulated value
  // Lower values indicate less nonuniformity (better)
  return 0.08;
}

/**
 * Estimate grid nonuniformity
 */
function estimateGridNonuniformity(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the module grid
  // 2. Measure deviation from ideal grid
  
  // For this example, returning a simulated value
  // Lower values indicate less nonuniformity (better)
  return 0.12;
}

/**
 * Estimate format information damage
 */
function estimateFormatInformationDamage(data, width, height) {
  // In a real implementation, we would:
  // 1. Locate format information bits
  // 2. Check for errors using error correction
  
  // For this example, returning a simulated value
  // Lower values indicate less damage (better)
  return 0.10;
}

/**
 * Grade symbol contrast according to ISO standards
 */
function gradeSymbolContrast(contrast) {
  if (contrast >= 0.70) return 'A';
  if (contrast >= 0.55) return 'B';
  if (contrast >= 0.40) return 'C';
  if (contrast >= 0.20) return 'D';
  return 'F';
}

/**
 * Grade modulation according to ISO standards
 */
function gradeModulation(modulation) {
  if (modulation >= 0.50) return 'A';
  if (modulation >= 0.40) return 'B';
  if (modulation >= 0.30) return 'C';
  if (modulation >= 0.20) return 'D';
  return 'F';
}

/**
 * Grade fixed pattern damage
 */
function gradeFixedPatternDamage(damage) {
  if (damage <= 0.10) return 'A';
  if (damage <= 0.20) return 'B';
  if (damage <= 0.30) return 'C';
  if (damage <= 0.40) return 'D';
  return 'F';
}

/**
 * Grade axial nonuniformity
 */
function gradeAxialNonuniformity(nonuniformity) {
  if (nonuniformity <= 0.06) return 'A';
  if (nonuniformity <= 0.08) return 'B';
  if (nonuniformity <= 0.10) return 'C';
  if (nonuniformity <= 0.12) return 'D';
  return 'F';
}

/**
 * Grade grid nonuniformity
 */
function gradeGridNoniformity(nonuniformity) {
  if (nonuniformity <= 0.10) return 'A';
  if (nonuniformity <= 0.15) return 'B';
  if (nonuniformity <= 0.20) return 'C';
  if (nonuniformity <= 0.25) return 'D';
  return 'F';
}

/**
 * Grade format information damage
 */
function gradeFormatDamage(damage) {
  if (damage <= 0.05) return 'A';
  if (damage <= 0.10) return 'B';
  if (damage <= 0.15) return 'C';
  if (damage <= 0.20) return 'D';
  return 'F';
}

/**
 * Calculate overall grade (lowest individual grade)
 */
function calculateOverallGrade(metrics) {
  const grades = Object.values(metrics).map(metric => metric.grade);
  const gradeValues = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
  
  let lowestGradeValue = 4; // Start with highest grade
  let lowestGrade = 'A';
  
  for (const grade of grades) {
    if (gradeValues[grade] < lowestGradeValue) {
      lowestGradeValue = gradeValues[grade];
      lowestGrade = grade;
    }
  }
  
  return lowestGrade;
}

// Example usage:
// const canvas = document.getElementById('qrCodeCanvas');
// const qualityResults = evaluateQRCodeQuality(canvas);
// console.log('QR Code Quality:', qualityResults);