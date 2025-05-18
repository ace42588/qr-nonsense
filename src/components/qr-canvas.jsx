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
  const [qrType, setQRT]
  const qrRef = useRef(null);
  const highlightRef = useRef(null);
  const { highlightedIds, matrix } = useQRData();
  const { highlightSegment } = useQRDataDispatch();
  //console.debug("QRCodeCanvas", { matrix, highlightedIds });

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
        <CardTitle>Total Visitors</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Total for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <div className="absolute right-4 top-4">
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="@[767px]/card:flex hidden"
          >
            <ToggleGroupItem value="90d" className="h-8 px-2.5">
              Last 3 months
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="h-8 px-2.5">
              Last 30 days
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="h-8 px-2.5">
              Last 7 days
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="@[767px]/card:hidden flex w-40"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}