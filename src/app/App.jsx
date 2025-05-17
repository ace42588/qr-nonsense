import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  QRDisplayTabs,
  SegmentDisplay,
  CodewordDisplay,
  MainViewTabs,
} from "../components";

import { InputProvider, QRDataProvider } from "../state";

import { QRCodeCanvas } from "../components/qr/QRCodeCanvas";
import { InputForm } from "../components/InputForm";
import { VideoScanner } from "../components/VideoScanner";

import "../assets/styles/App.css";

export default function App() {
  return (
    <div className="p-6 space-y-6">
      <InputProvider>
        <QRDataProvider>
          <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <InputForm />
        </TabsContent>

        <TabsContent value="actions">
          <div className="p-4 space-x-2">
            <Button onClick={handleHighlight}>Highlight Segment</Button>
            <Button variant="outline" onClick={clearHighlights}>Clear Highlights</Button>
          </div>
        </TabsContent>
      </Tabs>
          <Card>
            <CardContent className="p-4">
              <QRCodeCanvas />
            </CardContent>
          </Card>
          <div className="row">
            <div className="column">
              <div className="row">
                <MainViewTabs />
              </div>
            </div>
            <div className="column">
              <div className="row">
                <QRDisplayTabs />
              </div>
            </div>
          </div>
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
