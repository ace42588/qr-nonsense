/**
export function estimateGridNonuniformity(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the module grid
  // 2. Measure deviation from ideal grid
  
  // For this example, returning a simulated value
  // Lower values indicate less nonuniformity (better)
  return 0.12;
}
*/

/**
 * Estimate grid nonuniformity
 */
export function estimateGridNonuniformity(data, width, height, version) {
  const moduleCount = 17 + version * 4;
  const moduleSize = width / moduleCount;

  const lineProfile = (fixed, isRow) => {
    const values = [];
    for (let i = 0; i < moduleCount; i++) {
      const pos = Math.round(i * moduleSize + moduleSize / 2);
      const x = isRow ? pos : fixed;
      const y = isRow ? fixed : pos;
      const idx = (y * width + x) * 4;
      const dark = data[idx] < 128 ? 1 : 0;
      values.push(dark);
    }
    return values;
  };

  const rowScan = lineProfile(Math.round(height / 2), true);
  const colScan = lineProfile(Math.round(width / 2), false);

  function spacingVariance(arr) {
    const edges = [];
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] !== arr[i - 1]) edges.push(i);
    }
    const diffs = edges.slice(1).map((v, i) => v - edges[i]);
    const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + (d - mean) ** 2, 0) / diffs.length;
    return variance / mean ** 2; // normalize
  }

  return (spacingVariance(rowScan) + spacingVariance(colScan)) / 2;
}

/**
 * Grade grid nonuniformity
 */
export function gradeGridNonuniformity(nonuniformity) {
  if (nonuniformity <= 0.10) return 'A';
  if (nonuniformity <= 0.15) return 'B';
  if (nonuniformity <= 0.20) return 'C';
  if (nonuniformity <= 0.25) return 'D';
  return 'F';
}
