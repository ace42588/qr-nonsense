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

import { InputSidebar } from "../components/double-menu";
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
              <div className="grid auto-rows-min gap-4 md:grid-cols-2>
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
              <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
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
            <div className="grid min-h-svh lg:grid-cols-2">
              <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-xs">
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
                </div>
              </div>
              <div className="relative hidden bg-muted lg:block">
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
            <div className="row">
              <SegmentDisplay />
            </div>
            <div className="row">
              <CodewordDisplay />
            </div>
          </QRDataProvider>
        </SidebarInset>
      </SidebarProvider>
    </InputProvider>
  );
}
