/**
 * Calculate overall grade (lowest individual grade)
 */
export function calculateOverallGrade(metrics) {
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


/**
 * Detect the boundaries of the QR code in the image
 * @return {Object|null} Boundaries object with top, left, bottom, right or null if not found
 */
export function detectQRBoundaries(data, width, height) {
  // A real implementation would use more sophisticated edge detection
  // This is a simplified approach that looks for high contrast regions
  
  // First, convert to binary image using Otsu's method
  const grayValues = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    grayValues.push(gray);
  }
  
  const threshold = calculateOtsuThreshold(grayValues);
  const binary = new Uint8Array(width * height);
  
  for (let i = 0; i < grayValues.length; i++) {
    binary[i] = grayValues[i] > threshold ? 1 : 0;
  }
  
  // Find boundaries
  let top = height;
  let left = width;
  let bottom = 0;
  let right = 0;
  
  // Check horizontal projections
  for (let y = 0; y < height; y++) {
    let hasValue = false;
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] === 1) {
        hasValue = true;
        break;
      }
    }
    
    if (hasValue) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  
  // Check vertical projections
  for (let x = 0; x < width; x++) {
    let hasValue = false;
    for (let y = 0; y < height; y++) {
      if (binary[y * width + x] === 1) {
        hasValue = true;
        break;
      }
    }
    
    if (hasValue) {
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  
  // Validate boundaries
  if (right - left < 20 || bottom - top < 20) {
    return null; // Too small to be a QR code
  }
  
  return { top, left, bottom, right };
}

/**
 * Calculate Otsu's threshold for image binarization
 * @return {number} Threshold value between 0 and 1
 */
export function calculateOtsuThreshold(grayValues) {
  // Create histogram
  const histogram = new Array(256).fill(0);
  for (const value of grayValues) {
    const bin = Math.floor(value * 255);
    histogram[bin]++;
  }
  
  const total = grayValues.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  
  return threshold / 255;
}

/**
 * Smooth array values to reduce noise
 * @param {Array} array - Array of values to smooth
 * @param {number} windowSize - Size of moving average window
 * @return {Array} Smoothed array
 */
export function smoothArray(array, windowSize) {
  const result = [];
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < array.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = Math.max(0, i - halfWindow); j <= Math.min(array.length - 1, i + halfWindow); j++) {
      sum += array[j];
      count++;
    }
    
    result.push(sum / count);
  }
  
  return result;
}

/**
 * Find edges (transitions between light and dark) in a pattern
 * @param {Array} pattern - Array of grayscale values
 * @return {Array} Indices where edges occur
 */
export function findEdges(pattern) {
  const edges = [];
  const threshold = calculateOtsuThreshold(pattern);
  let prevBinary = pattern[0] > threshold ? 1 : 0;
  
  for (let i = 1; i < pattern.length; i++) {
    const binary = pattern[i] > threshold ? 1 : 0;
    if (binary !== prevBinary) {
      edges.push(i);
      prevBinary = binary;
    }
  }
  
  return edges;
}

