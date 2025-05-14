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
