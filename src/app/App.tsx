// External Libraries
import { JSX, useState } from "react";
import {
  Component,
  QrCode,
  Section,
  SquarePen,
  Image,
  ScanLine,
  Network,
  Layers,
  Sparkles,
  Binary,
  SplitSquareHorizontal,
  CircleDot,
} from "lucide-react";

// UI Components
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// Feature Components
import { InputCard } from "@/components/InputCard";
import { InputSidebar } from "@/components/InputSidebar";
import { QRCodeCanvas } from "@/components/QRCanvas";
import { QRImageHalftone } from "@/components/QRImageHalftone";
import { QRQArt } from "@/components/QRQArt";
import { QRCombined } from "@/components/QRCombined";
import { QRISQR } from "@/components/QRISQR";
import { QRAmbiguous } from "@/components/QRAmbiguous";
import { QREmbed } from "@/components/QREmbed";
import { SymbolCard } from "@/components/SymbolCard";
import { CodewordCard } from "@/components/CodewordCard";
import { GraphCard } from "@/components/GraphCard";
import { RsDecodeCard } from "@/components/RsDecodeCard";
import { ScannerCard } from "@/components/ScannerCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// State/Context
import { InputProvider } from "@/state/inputs/InputContext";
import { QRDataProvider } from "@/state/qr/QRDataContext";
import { ImageTransformProvider } from "@/state/image/ImageTransformContext";
import { QArtProvider } from "@/state/qr/QArtContext";

type LeftCard = "manual" | "scanner" | "symbols" | "codewords" | "graph" | "rs";
type QrType = "qr" | "hqr" | "qart" | "combined" | "isqr" | "ambiguous" | "embed";

const modeLabelClass = "hidden text-xs font-medium md:inline";

export default function App(): JSX.Element {
  const [leftCard, setLeftCard] = useState<LeftCard>("manual");
  const [qrType, setQrType] = useState<QrType>("qr");
  const dualPayloadMode = qrType === "ambiguous" || qrType === "embed";

  return (
    <ErrorBoundary>
      <InputProvider>
        <ImageTransformProvider>
          <SidebarProvider>
            <InputSidebar dualPayloadMode={dualPayloadMode} />
            <SidebarInset>
            <header className="sticky top-0 z-[200] flex shrink-0 flex-col gap-2 border-b bg-background pb-2 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] md:flex-row md:items-center md:gap-2 md:p-4">
              <div className="flex min-w-0 items-center gap-1 md:flex-1 md:gap-2 md:px-3">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="mr-1 h-4 shrink-0 md:mr-2" />
                <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <ToggleGroup
                    type="single"
                    value={leftCard}
                    onValueChange={(value: LeftCard) => value && setLeftCard(value)}
                    size="sm"
                    className="w-max justify-start"
                  >
                  <ToggleGroupItem value="manual" aria-label="Manual input" title="Input" className="gap-1.5 px-2.5">
                    <SquarePen className="h-4 w-4" />
                    <span className={modeLabelClass}>Input</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="scanner" aria-label="Scanner input" title="Scan" className="gap-1.5 px-2.5">
                    <ScanLine className="h-4 w-4" />
                    <span className={modeLabelClass}>Scan</span>
                  </ToggleGroupItem>
                  <Separator orientation="vertical" className="mx-1 h-4" />
                  <ToggleGroupItem value="symbols" aria-label="Symbols" title="Symbols" className="gap-1.5 px-2.5">
                    <Component className="h-4 w-4" />
                    <span className={modeLabelClass}>Symbols</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="codewords" aria-label="Codewords" title="Codewords" className="gap-1.5 px-2.5">
                    <Section className="h-4 w-4" />
                    <span className={modeLabelClass}>Codewords</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="graph" aria-label="Graph" title="Graph" className="gap-1.5 px-2.5">
                    <Network className="h-4 w-4" />
                    <span className={modeLabelClass}>Graph</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="rs" aria-label="RS decode" title="RS" className="gap-1.5 px-2.5">
                    <Binary className="h-4 w-4" />
                    <span className={modeLabelClass}>RS</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                </div>
              </div>
              <div className="min-w-0 overflow-x-auto md:flex-1 md:px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ToggleGroup
                  type="single"
                  value={qrType}
                  onValueChange={(value: QrType) => value && setQrType(value)}
                  size="sm"
                  className="w-max justify-start"
                >
                  <ToggleGroupItem value="qr" aria-label="QR" title="QR" className="gap-1.5 px-2.5">
                    <QrCode className="h-4 w-4" />
                    <span className={modeLabelClass}>QR</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="hqr" aria-label="HQR" title="HQR" className="gap-1.5 px-2.5">
                    <Image className="h-4 w-4" />
                    <span className={modeLabelClass}>HQR</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="qart" aria-label="QArt" title="QArt" className="gap-1.5 px-2.5">
                    <SquarePen className="h-4 w-4" />
                    <span className={modeLabelClass}>QArt</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="combined" aria-label="Combined" title="Combined" className="gap-1.5 px-2.5">
                    <Layers className="h-4 w-4" />
                    <span className={modeLabelClass}>Combined</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="isqr" aria-label="IS-QR" title="IS-QR" className="gap-1.5 px-2.5">
                    <Sparkles className="h-4 w-4" />
                    <span className={modeLabelClass}>IS-QR</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="ambiguous"
                    aria-label="Ambiguous"
                    title="Ambiguous"
                    className="gap-1.5 px-2.5"
                  >
                    <SplitSquareHorizontal className="h-4 w-4" />
                    <span className={modeLabelClass}>Ambiguous</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="embed"
                    aria-label="Embed"
                    title="Embed"
                    className="gap-1.5 px-2.5"
                  >
                    <CircleDot className="h-4 w-4" />
                    <span className={modeLabelClass}>Embed</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </header>
            <QRDataProvider>
              <QArtProvider>
                <div className="flex flex-1 flex-col gap-4 overflow-x-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:min-h-0 md:p-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:flex-1 md:min-h-0">
                    <div className="flex min-w-0 flex-col md:min-h-0 md:flex-1">
                      {leftCard === "manual" && <InputCard />}
                      {leftCard === "scanner" && <ScannerCard />}
                      {leftCard === "symbols" && <SymbolCard />}
                      {leftCard === "codewords" && <CodewordCard />}
                      {leftCard === "graph" && <GraphCard />}
                      {leftCard === "rs" && <RsDecodeCard />}
                    </div>
                    <div className="flex min-w-0 flex-col md:min-h-0 md:flex-1">
                      {qrType === "qr" && <QRCodeCanvas />}
                      {qrType === "hqr" && <QRImageHalftone />}
                      {qrType === "qart" && <QRQArt />}
                      {qrType === "combined" && <QRCombined />}
                      {qrType === "isqr" && <QRISQR />}
                      {qrType === "ambiguous" && <QRAmbiguous />}
                      {qrType === "embed" && <QREmbed />}
                    </div>
                  </div>
                </div>
              </QArtProvider>
            </QRDataProvider>
            </SidebarInset>
          </SidebarProvider>
        </ImageTransformProvider>
      </InputProvider>
    </ErrorBoundary>
  );
}
