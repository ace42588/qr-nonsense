import { ALIGNMENT_PATTERN } from "./constants";
import { makeNonDataModule } from "./utils";

function getAlignmentPatternPositions(version) {
  if (version === 1) return [];
  const positions = [6];
  const numPositions = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 17 - 13) / (numPositions - 1));
  for (
    let pos = version * 4 + 10 - step * (numPositions - 2);
    pos >= 6;
    pos -= step
  ) {
    positions.push(pos);
  }
  positions.push(version * 4 + 10);
  return positions;
}

function shouldDrawAlignmentPattern(x, y, size) {
    const finderPatternPositions = [
      { x: 0, y: 0 },
      { x: size - 7, y: 0 },
      { x: 0, y: size - 7 },
    ];

    for (const pos of finderPatternPositions) {
      if (Math.abs(pos.x - x) < 9 && Math.abs(pos.y - y) < 9) {
        return false;
      }
    }
    return true;
  }

function drawAlignmentPattern(centerX, centerY, matrix) {
  const source = { name: "AlignmentPattern" };
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const value = ALIGNMENT_PATTERN[y][x];
        matrix[centerY - 2 + y][centerX - 2 + x] = makeNonDataModule(
          value,
          source,
          centerX - 2 + x,
          centerY - 2 + y
        );
      }
    }
  }

export function addAlignmentPatterns(matrix) {
  const source = { name: "AlignmentPattern" };
  const size = matrix.length;
  const version = (size - 17) / 4;
  if (version === 1) return []; // Version 1 has no additional alignment patterns

  const positions = getAlignmentPatternPositions(version);

  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      if (shouldDrawAlignmentPattern(positions[i], positions[j], size)) {
        drawAlignmentPattern(positions[i], positions[j], matrix);
      }
    }
  }
}
