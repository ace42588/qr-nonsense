import { useState, useMemo } from "react";
import { useQRData, useQRDataDispatch } from "@/state/qr/QRDataContext";
import { useQArtResult } from "@/state/qr/QArtContext";
import { getCodewords } from "@/domain/qr";
import { useInputs } from "@/state/inputs/InputContext";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function CodewordCard() {
  const { highlightModules, clearAllHighlights } = useQRDataDispatch();
  const { highlightedIds, codewords: contextCodewords, versionInfo } = useQRData();
  const { qartResult } = useQArtResult();
  const { formatInfo } = useInputs();
  
  // Regenerate codewords from QArt segments if available, otherwise use context codewords
  const codewords = useMemo(() => {
    if (qartResult?.segments && qartResult.segments.length > 0) {
      try {
        // Regenerate codewords from QArt-optimized segments
        // Note: This creates new codeword objects, but segments already have correct bitIds
        const { codewords: regeneratedCodewords } = getCodewords(
          qartResult.segments,
          versionInfo.version,
          formatInfo.errorCorrectionLevel
        );
        return regeneratedCodewords;
      } catch (err) {
        console.warn("Failed to regenerate codewords from QArt segments:", err);
        return contextCodewords;
      }
    }
    return contextCodewords;
  }, [qartResult?.segments, contextCodewords, versionInfo.version, formatInfo.errorCorrectionLevel]);
  const [clicked, setClicked] = useState(false);

  const isHighlighted = (codeword) => {
    return codeword.bits.some(bit => highlightedIds.includes(bit.id));
  };

  /**
   * Returns appropriate CSS classes for codeword buttons based on type
   * - errorCorrection: Red background to distinguish from data codewords
   * - data: Blue background for data codewords
   */
  const getButtonClass = (codeword) => {
    if (codeword.type === "errorCorrection") {
      return "bg-red-100 text-red-800 hover:bg-red-200";
    }
    if (codeword.type === "data") {
      return "bg-blue-50 text-blue-800 hover:bg-blue-100";
    }
    // Default style for any future codeword types
    return "bg-gray-50 text-gray-800 hover:bg-gray-100";
  };

  const getVariant = (codeword) => {
    if (isHighlighted(codeword)) {
      return "default";
    }
    return "outline";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">Codewords</h3>
      </CardHeader>
      <CardContent className="relative">
        <TooltipProvider>
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {codewords.map((codeword) => (
                <Tooltip key={codeword.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={getVariant(codeword)}
                      className={`w-full justify-center ${getButtonClass(codeword)}`}
                      onClick={() => {
                        highlightModules(codeword.bits.map((b) => b.id));
                        setClicked(!clicked);
                      }}
                      onMouseEnter={() => {
                        if (!clicked) highlightModules(codeword.bits.map((b) => b.id));
                      }}
                      onMouseLeave={() => {
                        if (!clicked) clearAllHighlights();
                      }}
                      title={undefined}
                    >
                      {codeword.type}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-xs">
                      <div><b>Type:</b> {codeword.type}</div>
                      <div><b>ID:</b> {codeword.id}</div>
                      <div><b>Bits:</b> {codeword.bits.map(b => b.id).join(", ")}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </ScrollArea>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
