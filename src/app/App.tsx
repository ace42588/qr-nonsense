// External Libraries
import { JSX, useState } from "react";
import { Component, QrCode, Section, SquarePen, Image, ScanLine, Network, Layers } from "lucide-react";

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
import { SymbolCard } from "@/components/SymbolCard";
import { CodewordCard } from "@/components/CodewordCard";
import { GraphCard } from "@/components/GraphCard";
import { ScannerCard } from "@/components/ScannerCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// State/Context
import { InputProvider } from "@/state/inputs/InputContext";
import { QRDataProvider } from "@/state/qr/QRDataContext";
import { ImageTransformProvider } from "@/state/image/ImageTransformContext";
import { QArtProvider } from "@/state/qr/QArtContext";


type LeftCard = "manual" | "scanner" | "symbols" | "codewords" | "graph";
type QrType = "qr" | "hqr" | "qart" | "combined";

export default function App(): JSX.Element {
  const [leftCard, setLeftCard] = useState<LeftCard>("manual");
  const [qrType, setQrType] = useState<QrType>("qr");

  return (
    <ErrorBoundary>
      <InputProvider>
        <ImageTransformProvider>
          <SidebarProvider>
            <InputSidebar />
            <SidebarInset>
            <header className="sticky top-0 z-[200] flex shrink-0 items-center gap-2 border-b bg-background p-4">
              <div className="flex flex-1 items-center gap-2 px-3">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <ToggleGroup
                  type="single"
                  value={leftCard}
                  onValueChange={(value: LeftCard) => value && setLeftCard(value)}
                  size="sm"
                >
                  <ToggleGroupItem value="manual" aria-label="Manual input">
                    <SquarePen className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="scanner" aria-label="Scanner input">
                    <ScanLine className="h-4 w-4" />
                  </ToggleGroupItem>
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <ToggleGroupItem value="symbols" aria-label="Symbols">
                    <Component className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="codewords" aria-label="Codewords">
                    <Section className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="graph" aria-label="Graph">
                    <Network className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex flex-1 items-center gap-2 px-3">
                <ToggleGroup
                  type="single"
                  value={qrType}
                  onValueChange={(value: QrType) => value && setQrType(value)}
                  size="sm"
                >
                  <ToggleGroupItem value="qr" aria-label="QR">
                    <QrCode className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="hqr" aria-label="HQR">
                    <Image className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="qart" aria-label="QArt">
                    <SquarePen className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="combined" aria-label="Combined">
                    <Layers className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </header>
            <QRDataProvider>
              <QArtProvider>
                <div className="flex flex-1 flex-col gap-4 p-4 min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="min-w-0 flex-1 flex flex-col min-h-0">
                      {leftCard === "manual" && <InputCard />}
                      {leftCard === "scanner" && <ScannerCard />}
                      {leftCard === "symbols" && <SymbolCard />}
                      {leftCard === "codewords" && <CodewordCard />}
                      {leftCard === "graph" && <GraphCard />}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col min-h-0">
                      {qrType === "qr" && <QRCodeCanvas />}
                      {qrType === "hqr" && <QRImageHalftone />}
                      {qrType === "qart" && <QRQArt />}
                      {qrType === "combined" && <QRCombined />}
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