/**
 * Estimate fixed pattern damage by analyzing finder patterns and timing patterns
 * @param {Uint8ClampedArray} data - Image data from canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @return {number} Damage estimate (0-1 scale, lower is better)
 */
function estimateFixedPatternDamage(data, width, height) {
  // Step 1: Detect the QR code boundaries and size
  const boundaries = detectQRBoundaries(data, width, height);
  if (!boundaries) return 1.0; // Could not detect QR code
  
  const { top, left, bottom, right } = boundaries;
  const qrSize = Math.max(bottom - top, right - left);
  
  // Step 2: Locate the three finder patterns (approximate positions)
  const finderSize = Math.round(qrSize / 7); // Finder patterns are about 7x7 modules
  
  const finderPositions = [
    { x: left + finderSize/2, y: top + finderSize/2 },           // Top-left
    { x: right - finderSize/2, y: top + finderSize/2 },          // Top-right
    { x: left + finderSize/2, y: bottom - finderSize/2 }         // Bottom-left
  ];
  
  // Step 3: Validate each finder pattern using the 1:1:3:1:1 ratio
  let totalDamage = 0;
  
  finderPositions.forEach(finder => {
    // Extract horizontal pattern through center of finder pattern
    const horizontalPattern = extractLine(data, width, 
                                         finder.x - finderSize*2, finder.y, 
                                         finder.x + finderSize*2, finder.y);
    
    // Extract vertical pattern through center of finder pattern
    const verticalPattern = extractLine(data, width,
                                       finder.x, finder.y - finderSize*2,
                                       finder.x, finder.y + finderSize*2);
    
    // Calculate damage by comparing to ideal 1:1:3:1:1 ratio
    const horizontalDamage = calculatePatternDamage(horizontalPattern);
    const verticalDamage = calculatePatternDamage(verticalPattern);
    
    totalDamage += (horizontalDamage + verticalDamage) / 2;
  });
  
  // Step 4: Check timing patterns (horizontal and vertical lines of alternating modules)
  const horizontalTimingY = top + Math.round(finderSize * 1.5);
  const horizontalTiming = extractLine(data, width, left + finderSize, horizontalTimingY, right - finderSize, horizontalTimingY);
  
  const verticalTimingX = left + Math.round(finderSize * 1.5);
  const verticalTiming = extractLine(data, width, verticalTimingX, top + finderSize, verticalTimingX, bottom - finderSize);
  
  const timingDamage = (calculateTimingPatternDamage(horizontalTiming) + 
                        calculateTimingPatternDamage(verticalTiming)) / 2;
  
  // Combine finder pattern damage and timing pattern damage
  const avgFinderDamage = totalDamage / 3;
  return (avgFinderDamage * 0.7) + (timingDamage * 0.3); // Weighted average
}

/**
 * Extract pixel values along a line from (x1,y1) to (x2,y2)
 * @return {Array} Array of grayscale values along the line
 */
function extractLine(data, width, x1, y1, x2, y2) {
  const values = [];
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + (x2 - x1) * t);
    const y = Math.round(y1 + (y2 - y1) * t);
    
    // Get pixel value (grayscale)
    const pixelIndex = (y * width + x) * 4;
    if (pixelIndex >= 0 && pixelIndex < data.length) {
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const gray = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      values.push(gray);
    }
  }
  
  return values;
}

/**
 * Calculate damage by comparing to ideal finder pattern ratio (1:1:3:1:1)
 * @return {number} Damage value (0-1 scale, lower is better)
 */
function calculatePatternDamage(pattern) {
  // First, find transitions between light and dark
  // Smooth the pattern to reduce noise
  const smoothed = smoothArray(pattern, 5);
  
  // Find edges (transitions between light and dark)
  const edges = findEdges(smoothed);
  if (edges.length < 4) return 1.0; // Not enough edges to form a finder pattern
  
  // Calculate widths of each segment
  const widths = [];
  for (let i = 0; i < edges.length - 1; i++) {
    widths.push(edges[i+1] - edges[i]);
  }
  
  if (widths.length < 4) return 1.0;
  
  // Get the 5 main segments for the finder pattern (should follow 1:1:3:1:1 ratio)
  // Find the segment that's likely to be the center (widest)
  let centerIndex = 0;
  let maxWidth = 0;
  for (let i = 0; i < widths.length; i++) {
    if (widths[i] > maxWidth) {
      maxWidth = widths[i];
      centerIndex = i;
    }
  }
  
  // Need at least 2 segments before and after the center
  if (centerIndex < 2 || centerIndex > widths.length - 3) return 1.0;
  
  // Extract the 5 segments that should follow the 1:1:3:1:1 ratio
  const segments = widths.slice(centerIndex - 2, centerIndex + 3);
  if (segments.length !== 5) return 1.0;
  
  // Normalize segments to make the center = 3
  const totalWidth = segments.reduce((sum, width) => sum + width, 0);
  const normalizedSegments = segments.map(width => (width * 7) / totalWidth);
  
  // Compare to ideal ratio [1, 1, 3, 1, 1]
  const idealRatio = [1, 1, 3, 1, 1];
  let totalDeviation = 0;
  
  for (let i = 0; i < 5; i++) {
    totalDeviation += Math.abs(normalizedSegments[i] - idealRatio[i]);
  }
  
  // Normalize deviation to 0-1 range (0 = perfect, 1 = completely wrong)
  // Maximum possible deviation would be around 8
  return Math.min(1.0, totalDeviation / 8);
}

/**
 * Calculate damage for timing pattern by checking alternating pattern
 * @return {number} Damage value (0-1 scale, lower is better)
 */
function calculateTimingPatternDamage(pattern) {
  if (pattern.length < 8) return 1.0; // Too short to be a valid timing pattern
  
  // Threshold the pattern to binary values
  const threshold = calculateOtsuThreshold(pattern);
  const binary = pattern.map(value => value > threshold ? 1 : 0);
  
  // In a perfect timing pattern, modules should alternate perfectly
  let errors = 0;
  let expectedValue = binary[0];
  
  for (let i = 1; i < binary.length; i++) {
    expectedValue = 1 - expectedValue; // Should alternate
    if (binary[i] !== expectedValue) {
      errors++;
    }
  }
  
  return Math.min(1.0, errors / (binary.length / 2));
}

/**
 * Detect the boundaries of the QR code in the image
 * @return {Object|null} Boundaries object with top, left, bottom, right or null if not found
 */
function detectQRBoundaries(data, width, height) {
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
function calculateOtsuThreshold(grayValues) {
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
function smoothArray(array, windowSize) {
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
function findEdges(pattern) {
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


/**
 * Grade fixed pattern damage
 */
export function gradeFixedPatternDamage(damage) {
  if (damage <= 0.10) return 'A';
  if (damage <= 0.20) return 'B';
  if (damage <= 0.30) return 'C';
  if (damage <= 0.40) return 'D';
  return 'F';
}
