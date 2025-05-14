/**
 * Estimate modulation based on histogram analysis
 */
export function estimateModulation(data, minReflectance, maxReflectance) {
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
 * Grade modulation according to ISO standards
 */
export function gradeModulation(modulation) {
  if (modulation >= 0.50) return 'A';
  if (modulation >= 0.40) return 'B';
  if (modulation >= 0.30) return 'C';
  if (modulation >= 0.20) return 'D';
  return 'F';
}
