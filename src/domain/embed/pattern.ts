/**
 * Build a 3×3 submodule pattern: outer eight = Payload A, center = Payload B.
 * Values are 1 (dark) / 0 (light) for renderHalftonePattern.
 */
export function buildEmbedPattern(aIsDark: boolean, bIsDark: boolean): number[][] {
  const a = aIsDark ? 1 : 0;
  const b = bIsDark ? 1 : 0;
  return [
    [a, a, a],
    [a, b, a],
    [a, a, a],
  ];
}
