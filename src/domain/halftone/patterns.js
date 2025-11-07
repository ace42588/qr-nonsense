// Generate all possible 3x3 patterns with given center value
export function generatePatterns(center) {
  const patterns = [];
  for (let mask = 0; mask < 256; ++mask) {
    const pat = [
      [(mask >> 7) & 1, (mask >> 6) & 1, (mask >> 5) & 1],
      [(mask >> 0) & 1, center, (mask >> 4) & 1],
      [(mask >> 1) & 1, (mask >> 2) & 1, (mask >> 3) & 1],
    ];
    patterns.push(pat);
  }
  return patterns;
}

// Calculate pattern reliability based on reinforcement and transitions
export function patternReliability(pattern) {
  // Center pixel value
  const center = pattern[1][1];
  // Reinforcement: count how many adjacent subpixels match center
  let reinforcement = 0;
  for (let dy = -1; dy <= 1; ++dy) {
    for (let dx = -1; dx <= 1; ++dx) {
      if (dx === 0 && dy === 0) continue;
      if (pattern[1 + dy][1 + dx] === center) reinforcement++;
    }
  }
  // Transition penalty: count transitions (neighbor pairs)
  let transitions = 0;
  for (let y = 0; y < 3; ++y)
    for (let x = 0; x < 3; ++x) {
      if (x < 2 && pattern[y][x] !== pattern[y][x + 1]) transitions++;
      if (y < 2 && pattern[y][x] !== pattern[y + 1][x]) transitions++;
    }
  // Reliability heuristic: more reinforcement, fewer transitions
  return (reinforcement + 1) / (transitions + 1);
}

// Choose the best pattern based on brightness, importance and reliability
export function choosePattern(patterns, brightness, importance, reliabilityWeight) {
  let best,
    bestScore = Infinity;
  for (let pat of patterns) {
    const blacks = pat.flat().reduce((a, b) => a + b, 0);
    const reliability = patternReliability(pat);
    const imageScore = Math.abs(blacks / 9 - (1 - brightness));
    // Lower score is better; importance modulates between image fit and reliability
    const score =
      importance * imageScore +
      (1 - importance) * (1 - reliability) * reliabilityWeight;
    if (score < bestScore) {
      best = pat;
      bestScore = score;
    }
  }
  return best;
}