/**
 * Estimate axial nonuniformity
 *
export function estimateAxialNonuniformity(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the edges of the QR code
  // 2. Calculate how square the shape is
  
  // For this example, returning a simulated value
  // Lower values indicate less nonuniformity (better)
  return 0.08;
}
*/

export function estimateAxialNonuniformity(data, width, height) {
  // Convert RGBA to grayscale
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    grayscale[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }

  // Project onto X and Y axes
  const verticalProfile = new Array(width).fill(0);
  const horizontalProfile = new Array(height).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = grayscale[y * width + x];
      verticalProfile[x] += value;
      horizontalProfile[y] += value;
    }
  }

  // Normalize and find peak spacing
  function estimateSpacing(profile) {
    const diffs = [];
    for (let i = 1; i < profile.length; i++) {
      diffs.push(Math.abs(profile[i] - profile[i - 1]));
    }
    return diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
  }

  const spacingX = estimateSpacing(verticalProfile);
  const spacingY = estimateSpacing(horizontalProfile);

  return Math.abs(spacingX - spacingY) / Math.max(spacingX, spacingY);
}


/**
 * Grade axial nonuniformity
 */
export function gradeAxialNonuniformity(nonuniformity) {
  if (nonuniformity <= 0.06) return 'A';
  if (nonuniformity <= 0.08) return 'B';
  if (nonuniformity <= 0.10) return 'C';
  if (nonuniformity <= 0.12) return 'D';
  return 'F';
}
