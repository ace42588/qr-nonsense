export function calculatePenalty(matrix) {
  const size = matrix.length;
  let score = 0;

  // Rule 1: same-color runs
  for (let y = 0; y < size; y++) {
    let runColor = null;
    let runLength = 0;
    for (let x = 0; x < size; x++) {
      const value = !!matrix[y][x]?.isDark;
      if (value === runColor) {
        runLength++;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = value;
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  }

  for (let x = 0; x < size; x++) {
    let runColor = null;
    let runLength = 0;
    for (let y = 0; y < size; y++) {
      const value = !!matrix[y][x]?.isDark;
      if (value === runColor) {
        runLength++;
      } else {
        if (runLength >= 5) score += 3 + (runLength - 5);
        runColor = value;
        runLength = 1;
      }
    }
    if (runLength >= 5) score += 3 + (runLength - 5);
  }

  // Rule 2: 2x2 blocks
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const v = !!matrix[y][x]?.isDark;
      if (
        v === !!matrix[y][x + 1]?.isDark &&
        v === !!matrix[y + 1][x]?.isDark &&
        v === !!matrix[y + 1][x + 1]?.isDark
      ) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like patterns
  const pattern = [1, 0, 1, 1, 1, 0, 1];
  const patternStr = pattern.join("");

  const checkPattern = (arr) => arr.join("").includes(patternStr);

  for (let y = 0; y < size; y++) {
    const row = matrix[y].map((m) => (m?.isDark ? 1 : 0));
    if (checkPattern(row)) score += 40;
  }

  for (let x = 0; x < size; x++) {
    const col = matrix.map((row) => (row[x]?.isDark ? 1 : 0));
    if (checkPattern(col)) score += 40;
  }

  // Rule 4: dark/light balance
  const totalModules = size * size;
  const darkCount = matrix.flat().filter((m) => m?.isDark).length;
  const percent = (darkCount / totalModules) * 100;
  const fivePercentSteps = Math.abs(Math.round(percent / 5) - 10);
  score += fivePercentSteps * 10;

  return score;
}