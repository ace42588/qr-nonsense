import React, { useRef, useEffect, useState } from "react";
import { useQRData } from "@/state/qr/QRDataContext";

export function QRBase({ 
  size: initialSize = 420,
  quietZone = 4,
  onModuleClick,
  onModuleHover,
  renderModule,
  children,
  responsive = true,
  customMatrix = null,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { matrix: contextMatrix, highlightedIds } = useQRData();
  const matrix = customMatrix || contextMatrix;
  const [size, setSize] = useState(initialSize);

  // Responsive resizing
  useEffect(() => {
    if (!responsive) return;
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize(Math.floor(rect.width));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [responsive]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !matrix) return;

    const dimension = matrix.length;
    const totalDimension = dimension + quietZone * 2;
    const moduleSize = size / totalDimension;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size, size);

    // Draw modules
    for (let y = 0; y < dimension; y++) {
      for (let x = 0; x < dimension; x++) {
        const m = matrix[y][x];
        if (!m) continue;

        const moduleX = (x + quietZone) * moduleSize;
        const moduleY = (y + quietZone) * moduleSize;

        // Check if module should be highlighted
        // CRITICAL: Modules have both bitId and bit.id - we check both for compatibility.
        // The bit.id comes from the codewords, and segment.bitIds contain these same IDs.
        // When a symbol is clicked, we highlight modules whose bit.id matches the segment's bitIds.
        const moduleBitId = m.bit?.id || m.bitId;
        const isHighlighted = moduleBitId && highlightedIds && Array.isArray(highlightedIds) && highlightedIds.includes(moduleBitId);

        if (renderModule) {
          renderModule(ctx, m, moduleX, moduleY, moduleSize, {size, quietZone, moduleX, moduleY, x, y});
        } else {
          // Default rendering
          ctx.fillStyle = m.isDark ? "black" : "white";
          ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize);
        }

        // Draw highlight border if module is highlighted
        if (isHighlighted) {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.strokeRect(moduleX, moduleY, moduleSize, moduleSize);
        }
      }
    }
  }, [matrix, size, quietZone, renderModule, highlightedIds]);

  const getModuleFromEvent = (event) => {
    if (!matrix) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dimension = matrix.length;
    const totalDimension = dimension + quietZone * 2;
    const moduleSize = size / totalDimension;

    const xIndex = Math.floor(x / moduleSize) - quietZone;
    const yIndex = Math.floor(y / moduleSize) - quietZone;

    if (
      xIndex < 0 ||
      yIndex < 0 ||
      xIndex >= matrix.length ||
      yIndex >= matrix.length
    )
      return null;

    const module = matrix[yIndex]?.[xIndex];
    return module ? { module, xIndex, yIndex } : null;
  };

  const handleClick = (event) => {
    if (!onModuleClick) return;
    const result = getModuleFromEvent(event);
    if (result) {
      onModuleClick(result.module, result.xIndex, result.yIndex);
    }
  };

  const handleMouseMove = (event) => {
    if (!onModuleHover) return;
    const result = getModuleFromEvent(event);
    if (result) {
      onModuleHover(result.module, result.xIndex, result.yIndex);
    }
  };

  const handleMouseLeave = () => {
    if (onModuleHover) {
      onModuleHover(null, null, null);
    }
  };

  return (
    <div ref={containerRef} className="qr-base-container" style={{width: "100%", height: "auto", position: "relative"}}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onClick={handleClick}
        onContextMenu={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
        }}
      />
      {children}
    </div>
  );
} 