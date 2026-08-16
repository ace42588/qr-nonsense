/**
 * Render a module for Ambiguous QR:
 * - Agree → solid fill
 * - Disagree → 2×2 checkerboard (A on main diagonal unless phaseFlip)
 * Module center sits on the quadrant cross.
 */
export function renderAmbiguousModule(
  ctx: CanvasRenderingContext2D,
  aIsDark: boolean,
  bIsDark: boolean,
  moduleX: number,
  moduleY: number,
  moduleWidth: number,
  moduleHeight: number,
  phaseFlip = false
): void {
  ctx.imageSmoothingEnabled = false;

  const x0 = Math.round(moduleX);
  const y0 = Math.round(moduleY);
  const x1 = Math.round(moduleX + moduleWidth);
  const y1 = Math.round(moduleY + moduleHeight);
  const midX = Math.round(moduleX + moduleWidth / 2);
  const midY = Math.round(moduleY + moduleHeight / 2);

  const width = Math.max(1, x1 - x0);
  const height = Math.max(1, y1 - y0);

  if (aIsDark === bIsDark) {
    ctx.fillStyle = aIsDark ? "#000" : "#fff";
    ctx.fillRect(x0, y0, width, height);
    return;
  }

  const aColor = aIsDark ? "#000" : "#fff";
  const bColor = bIsDark ? "#000" : "#fff";
  // Default: TL/BR = A, TR/BL = B. phaseFlip swaps.
  const mainDiag = phaseFlip ? bColor : aColor;
  const antiDiag = phaseFlip ? aColor : bColor;

  const leftW = Math.max(1, midX - x0);
  const rightW = Math.max(1, x1 - midX);
  const topH = Math.max(1, midY - y0);
  const bottomH = Math.max(1, y1 - midY);

  // TL
  ctx.fillStyle = mainDiag;
  ctx.fillRect(x0, y0, leftW, topH);
  // TR
  ctx.fillStyle = antiDiag;
  ctx.fillRect(midX, y0, rightW, topH);
  // BL
  ctx.fillStyle = antiDiag;
  ctx.fillRect(x0, midY, leftW, bottomH);
  // BR
  ctx.fillStyle = mainDiag;
  ctx.fillRect(midX, midY, rightW, bottomH);
}

/** Pure helper for tests: which payload owns each quadrant (0=A, 1=B). */
export function checkerQuadrants(phaseFlip = false): [
  [0 | 1, 0 | 1],
  [0 | 1, 0 | 1],
] {
  if (phaseFlip) {
    return [
      [1, 0],
      [0, 1],
    ];
  }
  return [
    [0, 1],
    [1, 0],
  ];
}
