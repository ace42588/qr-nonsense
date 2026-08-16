import { renderHalftonePattern } from "@/domain/halftone/rendering";
import { buildEmbedPattern } from "./pattern";

export function renderEmbedModule(
  ctx: CanvasRenderingContext2D,
  aIsDark: boolean,
  bIsDark: boolean,
  moduleX: number,
  moduleY: number,
  moduleSize: number
): void {
  const pattern = buildEmbedPattern(aIsDark, bIsDark);
  renderHalftonePattern(ctx, pattern, moduleX, moduleY, moduleSize, 3);
}
