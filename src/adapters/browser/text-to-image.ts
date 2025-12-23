/**
 * Browser-based text-to-image rendering adapter
 * Renders styled text content to canvas and converts to data URL
 */

export interface TextStyles {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  textColor?: string; // default: black
  backgroundColor?: string; // default: white
  padding?: number; // default: 20px
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

/**
 * Measure text dimensions using canvas
 * @param text - Text to measure
 * @param styles - Text styling options
 * @param maxWidth - Maximum width for word wrapping (optional)
 * @returns Object with width and height
 */
function measureText(
  text: string,
  styles: TextStyles,
  maxWidth?: number
): { width: number; height: number; lines: string[] } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context for text measurement");
  }

  // Build font string
  const fontStyle = styles.italic ? "italic" : "normal";
  const fontWeight = styles.bold ? "bold" : "normal";
  const fontString = `${fontStyle} ${fontWeight} ${styles.fontSize}px ${styles.fontFamily}`;
  ctx.font = fontString;

  // Split text into lines and measure
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (!maxWidth || maxWidth <= 0) {
      // No wrapping - single line
      lines.push(paragraph);
    } else {
      // Word wrap
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

  // Measure all lines
  let maxLineWidth = 0;
  const lineHeight = styles.fontSize * 1.2; // Line height multiplier
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
 * Render styled text to canvas and return as data URL
 * @param text - Text content to render
 * @param styles - Text styling options
 * @returns Promise resolving to data URL string
 */
export async function renderTextToCanvas(
  text: string,
  styles: TextStyles
): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  // Ensure fonts are loaded
  await document.fonts.ready;

  const padding = styles.padding ?? 20;
  const textColor = styles.textColor ?? "#000000";
  const backgroundColor = styles.backgroundColor ?? "#FFFFFF";

  // Measure text (with word wrapping if needed)
  // Use a reasonable max width for wrapping (e.g., 800px)
  const maxWidth = 800;
  const { width: textWidth, height: textHeight, lines } = measureText(
    text,
    styles,
    maxWidth
  );

  // Calculate canvas size
  const minSize = 200;
  const canvasWidth = Math.max(minSize, textWidth + padding * 2);
  const canvasHeight = Math.max(minSize, textHeight + padding * 2);

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Set text style
  const fontStyle = styles.italic ? "italic" : "normal";
  const fontWeight = styles.bold ? "bold" : "normal";
  ctx.font = `${fontStyle} ${fontWeight} ${styles.fontSize}px ${styles.fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  // Calculate centered positions
  const lineHeight = styles.fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (canvasHeight - totalTextHeight) / 2;

  // Draw text lines centered horizontally
  let y = startY;
  for (const line of lines) {
    const x = canvasWidth / 2; // Center horizontally
    ctx.fillText(line, x, y);
    y += lineHeight;
  }

  // Convert to data URL
  return canvas.toDataURL("image/png");
}

