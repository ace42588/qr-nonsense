import React, { useRef, useEffect, useState } from "react";
import { useQRData } from "@/state/qr/QRDataContext";
import { getPatternName } from "@/utils/patternUtils";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCanvasAsPNG, downloadQRAsSVG } from "@/utils/downloadUtils";

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
  const [hoveredModule, setHoveredModule] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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

    // Disable image smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;

    const dimension = matrix.length;
    const totalDimension = dimension + quietZone * 2;
    const moduleSize = size / totalDimension;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, size, size);

    // Pre-calculate all module boundaries to ensure perfect edge-to-edge alignment
    // Calculate boundaries for all positions first, then use them consistently
    const xBoundaries = [];
    const yBoundaries = [];
    for (let i = 0; i <= dimension; i++) {
      xBoundaries[i] = Math.round((i + quietZone) * moduleSize);
      yBoundaries[i] = Math.round((i + quietZone) * moduleSize);
    }
    
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
        
        // Ensure minimum size of 1 pixel
        const finalWidth = Math.max(1, moduleWidth);
        const finalHeight = Math.max(1, moduleHeight);
        const moduleSizeSquare = Math.max(finalWidth, finalHeight);

        // Check if module should be highlighted
        // CRITICAL: Modules have both bitId and bit.id - we check both for compatibility.
        // The bit.id comes from the codewords, and segment.bitIds contain these same IDs.
        // When a symbol is clicked, we highlight modules whose bit.id matches the segment's bitIds.
        const moduleBitId = m.bit?.id || m.bitId;
        const isHighlighted = moduleBitId && highlightedIds && Array.isArray(highlightedIds) && highlightedIds.includes(moduleBitId);

        if (renderModule) {
          // Pass exact dimensions in renderCtx for renderModule callbacks that need them
          renderModule(ctx, m, moduleX, moduleY, moduleSizeSquare, {
            size, quietZone, moduleX, moduleY, x, y, dimension,
            moduleWidth: finalWidth, moduleHeight: finalHeight
          });
        } else {
          // Default rendering - use exact calculated dimensions for edge-to-edge coverage
          ctx.fillStyle = m.isDark ? "black" : "white";
          ctx.fillRect(moduleX, moduleY, finalWidth, finalHeight);
        }

        // Draw highlight border if module is highlighted
        if (isHighlighted) {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.strokeRect(moduleX, moduleY, moduleWidth, moduleHeight);
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
      
      // Update tooltip position and hovered module for pattern tooltips
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      setTooltipPosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      setHoveredModule(result.module);
    } else {
      setHoveredModule(null);
    }
  };

  const handleMouseLeave = () => {
    if (onModuleHover) {
      onModuleHover(null, null, null);
    }
    setHoveredModule(null);
  };

  const patternName = hoveredModule ? getPatternName(hoveredModule) : null;

  const handleDownload = (format) => {
    if (!matrix) return;

    try {
      if (format === "png") {
        if (canvasRef.current) {
          downloadCanvasAsPNG(canvasRef.current);
        }
      } else {
        downloadQRAsSVG(matrix, size, quietZone);
      }
    } catch (error) {
      console.error("Error downloading QR code:", error);
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
      {/* Tooltip for pattern modules */}
      {patternName && hoveredModule && (
        <div
          style={{
            position: "absolute",
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 30}px`,
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}
        >
          {patternName}
        </div>
      )}
      {/* Download button */}
      {matrix && (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!matrix}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("png")}>
                Download as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("svg")}>
                Download as SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {children}
    </div>
  );
} 