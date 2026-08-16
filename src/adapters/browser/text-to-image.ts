/**
 * Browser-based text-to-image rendering adapter
 * Renders styled text into a square canvas sized to the QR transform reference
 */

export interface TextStyles {
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  textColor?: string; // default: black
  backgroundColor?: string; // default: white
  padding?: number; // default: 20px
  /** Square output size; matches ImageTransform reference canvas (default: 480) */
  targetSize?: number;
  /** Fraction of targetSize the text block should fill (default: 0.9) */
  marginFactor?: number;
}

interface MeasureStyles {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

/**
 * Extract plain text from Slate editor value
 * @param value - Slate editor value (array of nodes)
 * @returns Plain text string
 */
export function extractTextFromSlate(value: any[]): string {
  if (!value || !Array.isArray(value)) {
    return "";
  }

  function traverse(node: any): string {
    if (typeof node === "string") {
      return node;
    }

    if (node.text) {
      return node.text;
    }

    if (Array.isArray(node.children)) {
      return node.children.map(traverse).join("");
    }

    return "";
  }

  return value.map(traverse).join("\n");
}

function buildFontString(styles: MeasureStyles): string {
  const fontStyle = styles.italic ? "italic" : "normal";
  const fontWeight = styles.bold ? "bold" : "normal";
  return `${fontStyle} ${fontWeight} ${styles.fontSize}px ${styles.fontFamily}`;
}

/**
 * Measure text dimensions using canvas
 * @param text - Text to measure
 * @param styles - Text styling options including fontSize
 * @param maxWidth - Maximum width for word wrapping (optional)
 * @returns Object with width, height, and wrapped lines
 */
function measureText(
  text: string,
  styles: MeasureStyles,
  maxWidth?: number
): { width: number; height: number; lines: string[] } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context for text measurement");
  }

  ctx.font = buildFontString(styles);

  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (!maxWidth || maxWidth <= 0) {
      lines.push(paragraph);
    } else {
      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }
  }

  let maxLineWidth = 0;
  const lineHeight = styles.fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;

  for (const line of lines) {
    const metrics = ctx.measureText(line);
    maxLineWidth = Math.max(maxLineWidth, metrics.width);
  }

  return {
    width: maxLineWidth,
    height: totalHeight,
    lines,
  };
}

/**
 * Binary-search the largest font size whose wrapped text fits in the content box.
 */
export function findFittingFontSize(
  text: string,
  styles: Omit<MeasureStyles, "fontSize">,
  contentWidth: number,
  contentHeight: number
): { fontSize: number; lines: string[]; width: number; height: number } {
  let low = 1;
  let high = Math.max(1, Math.floor(Math.min(contentWidth, contentHeight)));
  let best = {
    fontSize: 1,
    lines: [text],
    width: 0,
    height: 0,
  };

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const measured = measureText(
      text,
      { ...styles, fontSize: mid },
      contentWidth
    );

    if (measured.width <= contentWidth && measured.height <= contentHeight) {
      best = { fontSize: mid, ...measured };
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Re-measure at best size to ensure lines match the chosen font
  const final = measureText(
    text,
    { ...styles, fontSize: best.fontSize },
    contentWidth
  );
  return { fontSize: best.fontSize, ...final };
}

/**
 * Render styled text to a square canvas and return as data URL.
 * Font size is chosen automatically so the text fills the target canvas.
 */
export async function renderTextToCanvas(
  text: string,
  styles: TextStyles
): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const padding = styles.padding ?? 20;
  const targetSize = styles.targetSize ?? 480;
  const marginFactor = styles.marginFactor ?? 0.9;
  const textColor = styles.textColor ?? "#000000";
  const backgroundColor = styles.backgroundColor ?? "#FFFFFF";

  const contentBox = Math.max(1, targetSize * marginFactor - padding * 2);
  const measureStyles = {
    fontFamily: styles.fontFamily,
    bold: styles.bold,
    italic: styles.italic,
  };

  const { fontSize, lines } = findFittingFontSize(
    text,
    measureStyles,
    contentBox,
    contentBox
  );

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetSize, targetSize);

  ctx.font = buildFontString({ ...measureStyles, fontSize });
  ctx.fillStyle = textColor;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  let y = (targetSize - totalTextHeight) / 2;

  for (const line of lines) {
    ctx.fillText(line, targetSize / 2, y);
    y += lineHeight;
  }

  return canvas.toDataURL("image/png");
}
