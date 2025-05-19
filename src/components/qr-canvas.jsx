import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import { useRef, useEffect, useState } from "react";
import { useQRData, useQRDataDispatch } from "../state";

function getCanvasContext(canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return null;
  return canvas.getContext("2d");
}

function getCanvasDrawConfig(matrix, canvas) {
  const dimension = matrix.length;
  const quietZone = 4;
  const totalDimension = dimension + quietZone * 2;
  const moduleSize = canvas.width / totalDimension;
  return { dimension, quietZone, moduleSize };
}

function drawMatrixLayer(ctx, matrix, config) {
  const { dimension, quietZone, moduleSize } = config;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y][x];
      if (!m) continue;

      ctx.fillStyle = m.isDark ? "black" : "white";
      ctx.fillRect(
        (x + quietZone) * moduleSize,
        (y + quietZone) * moduleSize,
        moduleSize,
        moduleSize
      );
    }
  }
}

function drawHighlightLayer(ctx, matrix, highlightedIds, config) {
  const { dimension, quietZone, moduleSize } = config;
  const highlightedSet = new Set(highlightedIds);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const m = matrix[y][x];
      if (!m || !highlightedSet.has(m.bitId)) continue;

      ctx.strokeRect(
        (x + quietZone) * moduleSize,
        (y + quietZone) * moduleSize,
        moduleSize,
        moduleSize
      );
    }
  }
}

export function QRCanvasCard() {
  const [qrType, setQrType] = useState("basic");
  const qrRef = useRef(null);
  const highlightRef = useRef(null);
  const { highlightedIds, matrix } = useQRData();
  const { highlightSegment } = useQRDataDispatch();

  useEffect(() => {
    const ctx = getCanvasContext(qrRef);
    if (!ctx || !matrix) return;

    const config = getCanvasDrawConfig(matrix, ctx.canvas);
    drawMatrixLayer(ctx, matrix, config);
  }, [matrix]);

  useEffect(() => {
    const ctx = getCanvasContext(highlightRef);
    if (!ctx || !matrix) return;

    const config = getCanvasDrawConfig(matrix, ctx.canvas);
    drawHighlightLayer(ctx, matrix, highlightedIds, config);
  }, [highlightedIds, matrix]);

  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <div className="absolute right-4 top-4">
          <ToggleGroup
            type="single"
            value={qrType}
            onValueChange={setQrType}
            variant="outline"
            className="@[767px]/card:flex hidden"
          >
            <ToggleGroupItem value="basic" className="h-8 px-2.5">
              Basic
            </ToggleGroupItem>
            <ToggleGroupItem value="halftone" className="h-8 px-2.5">
              Halftone
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={qrType} onValueChange={setQrType}>
            <SelectTrigger
              className="@[767px]/card:hidden flex w-40"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Basic" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="basic" className="rounded-lg">
                Basic
              </SelectItem>
              <SelectItem value="halftone" className="rounded-lg">
                Halftone
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="qr-code-canvas-container">
      <div className="relative w-[420px] h-[420px]">

        <canvas className="absolute top-0 left-0 block w-full h-full pointer-events-none border border-black" id="qrCode" ref={qrRef} width="420" height="420"></canvas>
        <canvas
          className="absolute top-0 left-0 block w-full h-full pointer-events-none border border-black"
          id="canvas"
          ref={highlightRef}
          width="420"
          height="420"
          style={{ border: "1px solid #000" }}
        ></canvas>
      </div>
    </div>
      </CardContent>
    </Card>
  )
}