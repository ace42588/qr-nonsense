import { useState } from "react";

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
import { QRCodeCanvas } from "../components/QRCanvas";
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

import { InputCard } from "@/components/InputCard";

export default function App() {
  const [inputMethod, setInputMethod] = useState("manual");

  return (
    <InputProvider>
      <SidebarProvider>
        <InputSidebar />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <ToggleGroup type="single" value={inputMethod} onValueChange={setInputMethod} size="sm">
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
                <div className="flex flex-1 justify-center rounded-xl">
                  <InputCard />
                </div>
                <div className="flex flex-1 justify-center">
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
