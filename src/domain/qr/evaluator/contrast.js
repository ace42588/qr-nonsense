export function calculateMinMaxReflectance(data) {
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
 * Grade symbol contrast according to ISO standards
 */
export function gradeSymbolContrast(contrast) {
  if (contrast >= 0.70) return 'A';
  if (contrast >= 0.55) return 'B';
  if (contrast >= 0.40) return 'C';
  if (contrast >= 0.20) return 'D';
  return 'F';
}