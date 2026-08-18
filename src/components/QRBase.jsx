import React, { useRef, useEffect, useState, useMemo } from "react";
import { useQRData } from "@/state/qr/QRDataContext";
import { getPatternName } from "@/utils/patternUtils";
import { applyVisualDamage } from "@/domain/qr/corruption/applyDamage";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCanvasAsPNG, downloadCanvasAsSVG, downloadQRAsSTL, downloadCanvasFramesAsGif } from "@/utils/downloadUtils";
import { paintQrCanvas } from "@/utils/paintQrCanvas";
import { InvalidQRBanner } from "@/components/ui/message-banner";
import { advanceAnimationClock } from "@/domain/image/animationClock";

function isDrawableFrame(frame) {
  if (!frame) return false;
  if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
    return frame.width > 0 && frame.height > 0;
  }
  return (frame.width ?? 0) > 0 && (frame.height ?? 0) > 0;
}

function blitPlaybackFrame(ctx, frame, size) {
  if (!isDrawableFrame(frame)) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  try {
    ctx.drawImage(frame, 0, 0, size, size);
  } catch {
    // ImageBitmap may have been closed between the check and draw.
  }
}

async function imageDataFromPlaybackFrame(frame, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (!isDrawableFrame(frame)) return null;
  try {
    ctx.drawImage(frame, 0, 0, size, size);
  } catch {
    return null;
  }
  return ctx.getImageData(0, 0, size, size);
}

export function QRBase({ 
  size: initialSize = 420,
  quietZone = 4,
  onModuleClick,
  onModuleHover,
  renderModule,
  renderPasses = 1,
  children,
  responsive = true,
  customMatrix = null,
  gifExport = null,
  playback = null,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const playbackIndexRef = useRef(0);
  const { matrix: contextMatrix, highlightedIds, damagedModuleIds, invalidQR, invalidQRReason } = useQRData();
  const sourceMatrix = customMatrix || contextMatrix;
  // Apply visual damage for display/export (skip when a custom matrix is provided)
  const matrix = useMemo(() => {
    if (!sourceMatrix) return sourceMatrix;
    if (!damagedModuleIds?.length || customMatrix) return sourceMatrix;
    return applyVisualDamage(sourceMatrix, damagedModuleIds);
  }, [sourceMatrix, damagedModuleIds, customMatrix]);
  const [size, setSize] = useState(initialSize);
  const [hoveredModule, setHoveredModule] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [includeQuietZoneSTL, setIncludeQuietZoneSTL] = useState(false);

  const playbackFrames = playback?.frames;
  const playbackDelays = playback?.delaysMs;
  const playbackPaused = Boolean(playback?.paused);
  const playbackActive = Array.isArray(playbackFrames) && playbackFrames.length > 1;

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

    if (playbackActive) {
      const frames = playbackFrames;
      const delays = playbackDelays?.length === frames.length
        ? playbackDelays
        : frames.map(() => 100);

      playbackIndexRef.current = 0;
      blitPlaybackFrame(ctx, frames[0], size);

      if (playbackPaused) {
        return;
      }

      let elapsed = 0;
      let last = performance.now();
      let rafId = 0;
      const loop = (now) => {
        const dt = now - last;
        last = now;
        const next = advanceAnimationClock(
          elapsed + dt,
          delays,
          playbackIndexRef.current
        );
        elapsed = next.elapsedMs;
        if (next.index !== playbackIndexRef.current) {
          playbackIndexRef.current = next.index;
          const frame = frames[next.index] ?? frames[0];
          if (frame) blitPlaybackFrame(ctx, frame, size);
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    }

    paintQrCanvas(ctx, {
      matrix,
      size,
      quietZone,
      renderModule,
      renderPasses,
      highlightedIds,
      damagedModuleIds: customMatrix ? null : damagedModuleIds,
    });
  }, [
    matrix,
    size,
    quietZone,
    renderModule,
    renderPasses,
    highlightedIds,
    damagedModuleIds,
    customMatrix,
    playbackActive,
    playbackFrames,
    playbackDelays,
    playbackPaused,
  ]);

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

  const handleDownload = async (format) => {
    if (!matrix || !canvasRef.current) return;

    try {
      if (format === "png") {
        downloadCanvasAsPNG(canvasRef.current);
      } else if (format === "svg") {
        downloadCanvasAsSVG(canvasRef.current);
      } else if (format === "gif") {
        if (!gifExport?.delaysMs?.length) return;
        const frameImages = [];
        const canBlit =
          playbackActive &&
          playbackFrames.length === gifExport.delaysMs.length;
        for (let i = 0; i < gifExport.delaysMs.length; i++) {
          if (canBlit) {
            const image = await imageDataFromPlaybackFrame(playbackFrames[i], size);
            if (image) frameImages.push(image);
            continue;
          }
          if (!gifExport.getGifFrame) return;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          gifExport.getGifFrame(i, ctx, {
            size,
            quietZone,
            paintQrCanvas,
            matrix,
            renderPasses,
          });
          frameImages.push(ctx.getImageData(0, 0, size, size));
        }
        await downloadCanvasFramesAsGif(frameImages, gifExport.delaysMs);
      } else if (format === "stl-single") {
        downloadQRAsSTL(matrix, size, quietZone, 'single', 1.0, 2.0, 1.5, 0.1, includeQuietZoneSTL);
      } else if (format === "stl-multicolor") {
        downloadQRAsSTL(matrix, size, quietZone, 'multicolor', 1.0, 2.0, 1.5, 0.1, includeQuietZoneSTL);
      }
    } catch (error) {
      console.error("Error downloading QR code:", error);
    }
  };

  return (
    <div ref={containerRef} className="qr-base-container relative h-auto w-full max-w-full">
      {invalidQR && <InvalidQRBanner message={invalidQRReason} />}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        onClick={handleClick}
        onContextMenu={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block h-auto w-full"
      />
      {patternName && hoveredModule && (
        <div
          className="pointer-events-none absolute z-[1000] -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white"
          style={{
            left: `${tooltipPosition.x + 10}px`,
            top: `${tooltipPosition.y - 30}px`,
          }}
        >
          {patternName}
        </div>
      )}
      {matrix && (
        <div className="mt-2 flex justify-end">
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
              {gifExport?.delaysMs?.length > 1 && (gifExport.getGifFrame || playbackActive) && (
                <DropdownMenuItem onClick={() => handleDownload("gif")}>
                  Download as GIF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDownload("stl-single")}>
                Download as STL (Single Color)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("stl-multicolor")}>
                Download as STL (Multicolor)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={includeQuietZoneSTL}
                onCheckedChange={(checked) => setIncludeQuietZoneSTL(checked === true)}
              >
                Include quiet zone base (STL)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {children}
    </div>
  );
} 