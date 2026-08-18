// React
import React, { useState, useMemo } from "react";

// State/Context
import { useQRData, useQRDataDispatch } from "@/state/qr/QRDataContext";
import { useQArtResult } from "@/state/qr/QArtContext";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function SymbolCard() {
  const { highlightModules, clearAllHighlights } = useQRDataDispatch();
  const { highlightedIds, segments: contextSegments } = useQRData();
  const { qartResult } = useQArtResult();
  
  // Use QArt-optimized segments if available, otherwise use context segments
  const segments = useMemo(() => {
    return qartResult?.segments || contextSegments;
  }, [qartResult?.segments, contextSegments]);
  const [clicked, setClicked] = useState(false);

  const isHighlighted = (segment) => {
    // Check if any of the segment's bitIds are highlighted
    // highlightedIds contains bit IDs, not segment IDs
    if (segment.bitIds && segment.bitIds.length > 0) {
      return segment.bitIds.some(bitId => highlightedIds.includes(bitId));
    }
    return false;
  };

  // Color coding for non-data types
  const getButtonClass = (segment) => {
    if (["modeIndicator", "characterCountIndicator", "padding", "terminator"].includes(segment.type)) {
      if (segment.type === "modeIndicator") return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      if (segment.type === "characterCountIndicator") return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      if (segment.type === "padding") return "bg-gray-200 text-gray-600 hover:bg-gray-300";
      if (segment.type === "terminator") return "bg-green-100 text-green-800 hover:bg-green-200";
    }
    return "";
  };

  const getVariant = (segment) => {
    if (isHighlighted(segment)) {
      return "default";
    }
    return "outline";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">Symbols</h3>
      </CardHeader>
      <CardContent className="relative">
        <TooltipProvider>
          <ScrollArea className="h-[min(50vh,24rem)] flex-1 pr-4 md:h-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {segments.map((segment) => {
                return (
                  <Tooltip key={segment.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={getVariant(segment)}
                        className={`w-full justify-center ${getButtonClass(segment)}`}
                        onClick={() => {
                          // CRITICAL: segment.bitIds must match the bit.id values in the matrix modules.
                          // These bitIds are set when codewords are created from segments (see useDerivedQRData).
                          // If segments are recreated, they get new bitIds and won't match the matrix.
                          if (segment.bitIds && segment.bitIds.length > 0) {
                            highlightModules(segment.bitIds);
                            setClicked(!clicked);
                          }
                        }}
                        onMouseEnter={() => {
                          if (!clicked && segment.bitIds && segment.bitIds.length > 0) {
                            highlightModules(segment.bitIds);
                          }
                        }}
                        onMouseLeave={() => {
                          if (!clicked) {
                            clearAllHighlights();
                          }
                        }}
                        title={undefined}
                      >
                        {segment.text}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs">
                        <div><b>Type:</b> {segment.type}</div>
                        {segment.text && <div><b>Value:</b> {segment.text}</div>}
                        {segment.bitIds && <div><b>Bits:</b> {segment.bitIds.join(", ")}</div>}
                        <div><b>ID:</b> {segment.id}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </ScrollArea>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
