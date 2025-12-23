import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createEditor, Editor, Text } from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic } from "lucide-react";
import { renderTextToCanvas, extractTextFromSlate } from "@/adapters/browser/text-to-image";
import { useImageTransform } from "@/state/image/ImageTransformContext";

// Web-safe fonts
const FONT_FAMILIES = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Helvetica",
  "Comic Sans MS",
  "Trebuchet MS",
  "Impact",
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];

// Slate plugins for formatting
const isBoldMarkActive = (editor) => {
  const marks = Editor.marks(editor);
  return marks ? marks.bold === true : false;
};

const isItalicMarkActive = (editor) => {
  const marks = Editor.marks(editor);
  return marks ? marks.italic === true : false;
};

const toggleBoldMark = (editor) => {
  const isActive = isBoldMarkActive(editor);
  if (isActive) {
    Editor.removeMark(editor, "bold");
  } else {
    Editor.addMark(editor, "bold", true);
  }
};

const toggleItalicMark = (editor) => {
  const isActive = isItalicMarkActive(editor);
  if (isActive) {
    Editor.removeMark(editor, "italic");
  } else {
    Editor.addMark(editor, "italic", true);
  }
};

// Toolbar button components - must be inside Slate provider
const MarkButton = ({ format, icon: Icon, ...props }) => {
  const editor = useSlate();
  const isActive =
    format === "bold" ? isBoldMarkActive(editor) : isItalicMarkActive(editor);

  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size="sm"
      onMouseDown={(e) => {
        e.preventDefault();
        if (format === "bold") {
          toggleBoldMark(editor);
        } else if (format === "italic") {
          toggleItalicMark(editor);
        }
      }}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};

// Custom render leaf function for formatting
const renderLeaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  return <span {...attributes}>{children}</span>;
};

export function TextToImageEditor() {
  const { setImageUrl } = useImageTransform();
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(24);
  const [isRendering, setIsRendering] = useState(false);

  // Initialize Slate editor
  const editor = useMemo(() => withReact(createEditor()), []);

  // Initial editor value
  const [value, setValue] = useState([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);

  // Track formatting state - check if any selected text has formatting
  const [hasBold, setHasBold] = useState(false);
  const [hasItalic, setHasItalic] = useState(false);

  // Update formatting state when editor value changes
  useEffect(() => {
    // Check if any text nodes have bold/italic marks
    let foundBold = false;
    let foundItalic = false;

    function checkNode(node) {
      if (Text.isText(node)) {
        if (node.bold) foundBold = true;
        if (node.italic) foundItalic = true;
      }
      if (node.children) {
        node.children.forEach(checkNode);
      }
    }

    value.forEach(checkNode);
    setHasBold(foundBold);
    setHasItalic(foundItalic);
  }, [value]);

  const handleUseAsImage = useCallback(async () => {
    const text = extractTextFromSlate(value);
    if (!text || text.trim().length === 0) {
      alert("Please enter some text first");
      return;
    }

    setIsRendering(true);
    try {
      const dataUrl = await renderTextToCanvas(text, {
        fontFamily,
        fontSize,
        bold: hasBold,
        italic: hasItalic,
      });
      setImageUrl(dataUrl);
    } catch (error) {
      console.error("Error rendering text to image:", error);
      alert("Failed to render text. Please try again.");
    } finally {
      setIsRendering(false);
    }
  }, [value, fontFamily, fontSize, hasBold, hasItalic, setImageUrl]);

  return (
    <div className="space-y-3">
      <Slate editor={editor} initialValue={value} onChange={setValue}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fontSize.toString()} onValueChange={(v) => setFontSize(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <MarkButton format="bold" icon={Bold} aria-label="Bold" />
          <MarkButton format="italic" icon={Italic} aria-label="Italic" />
        </div>

        {/* Editor */}
        <div className="border rounded-md p-3 min-h-[100px] bg-background">
          <Editable
            renderLeaf={renderLeaf}
            placeholder="Type your text here..."
            className="outline-none min-h-[80px]"
            style={{
              fontFamily: fontFamily,
              fontSize: `${fontSize}px`,
            }}
          />
        </div>
      </Slate>

      {/* Use as Image Button */}
      <Button
        onClick={handleUseAsImage}
        disabled={isRendering}
        className="w-full"
        variant="default"
      >
        {isRendering ? "Rendering..." : "Use as Image"}
      </Button>
    </div>
  );
}

