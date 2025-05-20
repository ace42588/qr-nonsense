import { useState } from "react";
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

import { InputSidebar } from "../components/input-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";

export default function App() {
  return (
    <InputProvider>
      <SidebarProvider>
        <InputSidebar />
        <SidebarInset>
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
