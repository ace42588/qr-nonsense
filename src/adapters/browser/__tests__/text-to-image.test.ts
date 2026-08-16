import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  extractTextFromSlate,
  findFittingFontSize,
  renderTextToCanvas,
} from "../text-to-image";

/** Approximate glyph width as a fraction of fontSize (monospace-like). */
const CHAR_WIDTH_RATIO = 0.6;

function installCanvasMeasureMock() {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ) {
    if (contextId !== "2d") {
      return originalGetContext.call(this, contextId as "2d", ...args);
    }

    let currentFont = "16px Arial";
    const ctx = {
      fillStyle: "#000",
      textBaseline: "top",
      textAlign: "left",
      get font() {
        return currentFont;
      },
      set font(value: string) {
        currentFont = value;
      },
      measureText(text: string) {
        const match = currentFont.match(/(\d+(?:\.\d+)?)px/);
        const fontSize = match ? Number(match[1]) : 16;
        return { width: text.length * fontSize * CHAR_WIDTH_RATIO };
      },
      fillRect() {},
      fillText() {},
    };

    return ctx as unknown as CanvasRenderingContext2D;
  } as typeof HTMLCanvasElement.prototype.getContext;

  // jsdom's toDataURL exists but throws without the canvas package
  HTMLCanvasElement.prototype.toDataURL = function () {
    return `data:image/png;base64,stub${this.width}x${this.height}`;
  };

  return () => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  };
}

describe("extractTextFromSlate", () => {
  it("returns empty string for nullish or non-array values", () => {
    expect(extractTextFromSlate(null as any)).toBe("");
    expect(extractTextFromSlate(undefined as any)).toBe("");
    expect(extractTextFromSlate("nope" as any)).toBe("");
  });

  it("extracts plain text from a single paragraph", () => {
    expect(
      extractTextFromSlate([
        { type: "paragraph", children: [{ text: "Hello" }] },
      ])
    ).toBe("Hello");
  });

  it("joins paragraphs with newlines", () => {
    expect(
      extractTextFromSlate([
        { type: "paragraph", children: [{ text: "Line 1" }] },
        { type: "paragraph", children: [{ text: "Line 2" }] },
      ])
    ).toBe("Line 1\nLine 2");
  });

  it("concatenates multiple text nodes in a paragraph", () => {
    expect(
      extractTextFromSlate([
        {
          type: "paragraph",
          children: [{ text: "bold", bold: true }, { text: " plain" }],
        },
      ])
    ).toBe("bold plain");
  });
});

describe("findFittingFontSize", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installCanvasMeasureMock();
  });

  afterEach(() => {
    restore();
  });

  it("chooses a font size that fits the content box without a user font size", () => {
    const contentBox = 200;
    const result = findFittingFontSize(
      "Hi",
      { fontFamily: "Arial", bold: false, italic: false },
      contentBox,
      contentBox
    );

    expect(result.fontSize).toBeGreaterThan(1);
    expect(result.width).toBeLessThanOrEqual(contentBox);
    expect(result.height).toBeLessThanOrEqual(contentBox);
  });

  it("uses a smaller font for longer text than for short text", () => {
    const contentBox = 200;
    const styles = { fontFamily: "Arial", bold: false, italic: false };
    const short = findFittingFontSize("OK", styles, contentBox, contentBox);
    const long = findFittingFontSize(
      "This is a much longer piece of text that must wrap and shrink",
      styles,
      contentBox,
      contentBox
    );

    expect(long.fontSize).toBeLessThan(short.fontSize);
    expect(long.width).toBeLessThanOrEqual(contentBox);
    expect(long.height).toBeLessThanOrEqual(contentBox);
  });
});

describe("renderTextToCanvas", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installCanvasMeasureMock();
  });

  afterEach(() => {
    restore();
  });

  it("returns a PNG data URL for fitted square output", async () => {
    const dataUrl = await renderTextToCanvas("Hello", {
      fontFamily: "Arial",
      bold: false,
      italic: false,
      targetSize: 240,
    });

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl).toContain("240x240");
  });

  it("renders short and long text without requiring fontSize", async () => {
    await expect(
      renderTextToCanvas("A", {
        fontFamily: "Arial",
        bold: true,
        italic: false,
        targetSize: 120,
      })
    ).resolves.toMatch(/^data:image\/png/);

    await expect(
      renderTextToCanvas(
        "Longer copy that wraps across several lines inside the square",
        {
          fontFamily: "Georgia",
          bold: false,
          italic: true,
          targetSize: 120,
        }
      )
    ).resolves.toMatch(/^data:image\/png/);
  });

  it("rejects empty text", async () => {
    await expect(
      renderTextToCanvas("   ", {
        fontFamily: "Arial",
        bold: false,
        italic: false,
      })
    ).rejects.toThrow("Text cannot be empty");
  });
});
