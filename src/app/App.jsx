import { useRef, useState } from "react";

import { useQRDataDispatch, useInputDispatch } from "../state";
import jsQR from "jsqr";

import {
  SquarePen,
  Video
} from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { QRCodeCanvas } from "../components/QRCanvas";
import { InputForm } from "../components/InputForm";
import { VideoScanner } from "../components/VideoScanner";
import { QRImageHalftone } from "../components/Halftone";
import { SegmentDisplay } from "../components/SegmentDisplay";
import { CodewordDisplay } from "../components/CodewordDisplay";

import { InputProvider, QRDataProvider } from "../state";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { InputSidebar } from "../components/input-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";

import { BasicInput } from "@/components/BasicInput";
import { JsonInput } from "@/components/JsonInput";
import { BitFieldInput } from "@/components/BitFieldInput";
import { MACGenerator } from "@/components/MACGenerator";

const INPUT_TYPES = {
  basic: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const { setInputs } = useInputDispatch();
  
  return (
    <InputProvider>
      <SidebarProvider>
        <InputSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <ToggleGroup type="single" size="sm">
                <ToggleGroupItem value="manual" aria-label="Toggle bold">
                  <SquarePen className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="scanner" aria-label="Toggle italic">
                  <Video className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </header>
          <QRDataProvider>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="grid auto-rows-min gap-4 md:grid-cols-2">
                <div className="flex flex-1 items-center justify-center rounded-xl">
                  <Tabs defaultValue="manual" className="w-half">
                    <TabsList>
                      <TabsTrigger value="manual">Input</TabsTrigger>
                      <TabsTrigger value="scanner">Scanner</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual">
                      <InputForm />
                    </TabsContent>

                    <TabsContent value="scanner">
                      <VideoScanner />
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <Tabs defaultValue="qr" className="w-half">
                    <TabsList>
                      <TabsTrigger value="qr">QR</TabsTrigger>
                      <TabsTrigger value="hqr">HQR</TabsTrigger>
                    </TabsList>

                    <TabsContent value="qr">
                      <QRCodeCanvas />
                    </TabsContent>

                    <TabsContent value="hqr">
                      <QRImageHalftone />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
            <div className="grid auto-rows-min gap-4">
              <SegmentDisplay />
            </div>
            <div className="grid auto-rows-min gap-4">
              <CodewordDisplay />
            </div>
          </QRDataProvider>
        </SidebarInset>
      </SidebarProvider>
    </InputProvider>
  );
}
