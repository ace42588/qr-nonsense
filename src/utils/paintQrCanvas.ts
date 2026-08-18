/**
 * Paint a QR matrix onto a 2D canvas using the same module loop as QRBase.
 */

export interface PaintQrRenderContext {
  size: number;
  quietZone: number;
  moduleX: number;
  moduleY: number;
  x: number;
  y: number;
  dimension: number;
  moduleWidth: number;
  moduleHeight: number;
  pass: number;
  passes: number;
}

export type PaintQrRenderModule = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  module: { isDark?: boolean; bit?: { id?: string }; bitId?: string; id?: string },
  moduleX: number,
  moduleY: number,
  moduleSize: number,
  renderCtx: PaintQrRenderContext
) => void;

export interface PaintQrCanvasOptions {
  matrix: Array<Array<{ isDark?: boolean; bit?: { id?: string }; bitId?: string; id?: string } | null>>;
  size: number;
  quietZone?: number;
  renderModule?: PaintQrRenderModule | null;
  renderPasses?: number;
  highlightedIds?: string[] | null;
  damagedModuleIds?: string[] | null;
}

export function paintQrCanvas(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  options: PaintQrCanvasOptions
): void {
  const {
    matrix,
    size,
    quietZone = 4,
    renderModule = null,
    renderPasses = 1,
    highlightedIds = null,
    damagedModuleIds = null,
  } = options;

  if (!matrix) return;

  ctx.imageSmoothingEnabled = false;

  const dimension = matrix.length;
  const totalDimension = dimension + quietZone * 2;
  const moduleSize = size / totalDimension;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, size, size);

  const xBoundaries: number[] = [];
  const yBoundaries: number[] = [];
  for (let i = 0; i <= dimension; i++) {
    xBoundaries[i] = Math.round((i + quietZone) * moduleSize);
    yBoundaries[i] = Math.round((i + quietZone) * moduleSize);
  }

  const passes = Math.max(1, renderPasses | 0);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < dimension; y++) {
      const moduleY = yBoundaries[y];
      const nextModuleY = yBoundaries[y + 1];
      const moduleHeight = nextModuleY - moduleY;

      for (let x = 0; x < dimension; x++) {
        const m = matrix[y][x];
        if (!m) continue;

        const moduleX = xBoundaries[x];
        const nextModuleX = xBoundaries[x + 1];
        const moduleWidth = nextModuleX - moduleX;
        const finalWidth = Math.max(1, moduleWidth);
        const finalHeight = Math.max(1, moduleHeight);
        const moduleSizeSquare = Math.max(finalWidth, finalHeight);

        const moduleBitId = m.bit?.id || m.bitId;
        const isHighlighted =
          !!(moduleBitId && highlightedIds && highlightedIds.includes(moduleBitId));
        const isDamaged = !!(
          m.id &&
          damagedModuleIds &&
          damagedModuleIds.includes(m.id)
        );

        if (renderModule) {
          renderModule(ctx, m, moduleX, moduleY, moduleSizeSquare, {
            size,
            quietZone,
            moduleX,
            moduleY,
            x,
            y,
            dimension,
            moduleWidth: finalWidth,
            moduleHeight: finalHeight,
            pass,
            passes,
          });
        } else if (pass === 0) {
          ctx.fillStyle = m.isDark ? "black" : "white";
          ctx.fillRect(moduleX, moduleY, finalWidth, finalHeight);
        }

        if (pass === passes - 1) {
          if (isDamaged) {
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 2;
            ctx.strokeRect(moduleX, moduleY, moduleWidth, moduleHeight);
          }
          if (isHighlighted) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(moduleX, moduleY, moduleWidth, moduleHeight);
          }
        }
      }
    }
  }
}
