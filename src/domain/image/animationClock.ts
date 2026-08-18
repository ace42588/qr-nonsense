/**
 * Pure GIF/WebP playback clock. Subtracts frame delays from elapsed time so a
 * slow tick jumps to the correct index instead of queuing paints.
 */
export function advanceAnimationClock(
  elapsedMs: number,
  delaysMs: number[],
  index: number
): { index: number; elapsedMs: number } {
  const count = delaysMs.length;
  if (count === 0) {
    return { index: 0, elapsedMs: 0 };
  }

  let elapsed = Math.max(0, elapsedMs);
  let i = ((index % count) + count) % count;
  const maxSteps = count * 8 + 16;
  let steps = 0;

  while (steps < maxSteps) {
    const delay = Math.max(1, delaysMs[i] ?? 100);
    if (elapsed < delay) break;
    elapsed -= delay;
    i = (i + 1) % count;
    steps += 1;
  }

  return { index: i, elapsedMs: elapsed };
}
