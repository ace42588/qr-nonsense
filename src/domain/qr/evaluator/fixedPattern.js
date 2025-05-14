/**
export function estimateFixedPatternDamage(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the finder patterns (top-left, top-right, bottom-left)
  // 2. Analyze their shape and contrast
  // 3. Check timing patterns
  
  // For this example, returning a simulated value
  // Lower values indicate less damage (better)
  return 0.15;
}
*/

function sampleRegion(data, width, x0, y0, size) {
  let darkCount = 0, total = 0;
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      const idx = (y * width + x) * 4;
      const brightness = data[idx]; // Assume grayscale or use R
      if (brightness < 128) darkCount++;
      total++;
    }
  }
  return darkCount / total; // 1 = all dark, 0 = all light
}

export function estimateFixedPatternDamage(data, width, height, version) {
  const moduleCount = 17 + version * 4;
  const moduleSize = width / moduleCount;
  const size = Math.floor(moduleSize * 7);

  const coords = [
    [0, 0], // top-left
    [width - size, 0], // top-right
    [0, height - size], // bottom-left
  ];

  const finderAverages = coords.map(([x, y]) =>
    sampleRegion(data, width, Math.round(x), Math.round(y), size)
  );

  // Sample timing patterns (row 6, col 6)
  const tRow = 6 * moduleSize;
  const tCol = 6 * moduleSize;
  let timingErrors = 0;
  const steps = moduleCount - 14;

  for (let i = 8; i < moduleCount - 8; i++) {
    const rowX = Math.round(i * moduleSize);
    const colY = Math.round(i * moduleSize);

    const rowIdx = (Math.round(tRow) * width + rowX) * 4;
    const colIdx = (colY * width + Math.round(tCol)) * 4;

    const rowDark = data[rowIdx] < 128;
    const colDark = data[colIdx] < 128;

    const expected = i % 2 === 0; // timing pattern alternates

    if (rowDark !== expected) timingErrors++;
    if (colDark !== expected) timingErrors++;
  }

  const timingScore = 1 - timingErrors / (steps * 2);
  const finderScore = 1 - finderAverages.map(v => Math.abs(0.5 - v) * 2).reduce((a, b) => a + b, 0) / 3;

  return (timingScore + finderScore) / 2; // 0 = bad, 1 = perfect
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
