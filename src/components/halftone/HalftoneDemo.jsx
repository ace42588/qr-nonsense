import React, { useState, useCallback } from "react";
import Halftone from "./Halftone";

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=512&q=80";

export default function HalftoneDemo() {
  const [src, setSrc] = useState(DEFAULT_IMG);
  const [dotSize, setDotSize] = useState(6);
  const [gap, setGap] = useState(2);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(400);
  const [dragActive, setDragActive] = useState(false);

  // Handle file input
  const handleFile = useCallback((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setSrc(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  // Drag & drop
  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // File input click
  const onFileChange = (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#f5f5f7",
        minHeight: "100vh",
        padding: "2rem",
        color: "#222",
      }}
    >
      <h1 style={{ textAlign: "center" }}>Halftone React Demo</h1>
      <div
        style={{
          maxWidth: 500,
          margin: "2rem auto",
          background: "#fff",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 4px 32px #0001",
        }}
      >
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{
            border: dragActive
              ? "2px dashed #0077ff"
              : "2px dashed #bbb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            background: dragActive ? "#e6f2ff" : "#fafafa",
            transition: "background 0.2s, border 0.2s",
            textAlign: "center",
            cursor: "pointer",
          }}
          title="Drop an image here or click to choose"
          onClick={() => document.getElementById("fileinput").click()}
        >
          <input
            id="fileinput"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <div style={{ marginBottom: 8 }}>
            <strong>
              {dragActive
                ? "Drop your image!"
                : "Click or drag & drop to load an image"}
            </strong>
          </div>
          <img
            src={src}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: 120,
              borderRadius: 8,
              opacity: 0.8,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <label style={{ flex: 1 }}>
            Dot Size
            <input
              type="range"
              min={2}
              max={24}
              value={dotSize}
              onChange={(e) => setDotSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div>{dotSize}px</div>
          </label>
          <label style={{ flex: 1 }}>
            Gap
            <input
              type="range"
              min={0}
              max={16}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div>{gap}px</div>
          </label>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <label style={{ flex: 1 }}>
            Scale
            <input
              type="range"
              min={0.2}
              max={2}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div>{scale}x</div>
          </label>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <label style={{ flex: 1 }}>
            Width
            <input
              type="number"
              min={100}
              max={800}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
          <label style={{ flex: 1 }}>
            Height
            <input
              type="number"
              min={100}
              max={800}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
        </div>
        <Halftone
          src={src}
          dotSize={dotSize}
          gap={gap}
          scale={scale}
          width={width}
          height={height}
        />
        <div style={{ textAlign: "center", fontSize: 12, marginTop: 12 }}>
          <a
            href="https://anderoonies.github.io/projects/halftone/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0077ff" }}
          >
            Original inspiration
          </a>
        </div>
      </div>
    </div>
  );
}
