import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SegmentDisplay,
  CodewordDisplay,
} from "../components";

import { InputProvider, QRDataProvider } from "../state";

import { QRCodeCanvas } from "../components/qr/QRCodeCanvas";
import { InputForm } from "../components/InputForm";
import { VideoScanner } from "../components/VideoScanner";
import { QRImageHalftone } from "../components/halftone/QRImageHalftone";

export default function App() {
  return (
    <div className="p-6 space-y-6">
      <InputProvider>
        <Tabs defaultValue="manual" className="w-full">
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
        <QRDataProvider>
          <Tabs defaultValue="qr" className="w-full">
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
          <div className="row">
            <SegmentDisplay />
          </div>
          <div className="row">
            <CodewordDisplay />
          </div>
        </QRDataProvider>
      </InputProvider>
    </div>
  );
}
