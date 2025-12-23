// UI Components
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Icons
import { ChevronDown, Upload, Type, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

// State
import { useImageTransform } from "@/state/image/ImageTransformContext";
import { TextToImageEditor } from "@/components/TextToImageEditor";

export function ImageTransformInput() {
  const {
    scale,
    offsetX,
    offsetY,
    imageUrl,
    canvasSize,
    setScale,
    setOffsetX,
    setOffsetY,
    setImageUrl,
    fileInputRef,
    handleImageUpload,
  } = useImageTransform();

  return (
    <Collapsible
      key="imageTransform"
      defaultOpen={false}
      className="group/collapsible"
    >
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            Image
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarMenu>
            <SidebarMenuItem key="Image URL">
              <SidebarMenuButton asChild isActive={true}>
                <Input
                  id="image-url"
                  type="text"
                  value={imageUrl || ""}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="w-full"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem key="Image Upload">
              <SidebarMenuButton asChild isActive={true}>
                <div className="w-full flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Button>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem key="Text to Image">
              <Collapsible defaultOpen={false} className="group/text-collapsible">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="w-full">
                    <Type className="h-4 w-4" />
                    Text to Image
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/text-collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="px-2 pb-2">
                    <TextToImageEditor />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
            <SidebarMenuItem key="Position">
              <div className="w-full flex flex-col gap-2 px-2 py-2">
                <label className="text-sm whitespace-nowrap text-sidebar-foreground">
                  Position:
                </label>
                <div className="grid grid-cols-3 gap-1 w-full">
                  <div className="col-start-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOffsetY = Math.max(-canvasSize / 2, offsetY - 10);
                        setOffsetY(newOffsetY);
                      }}
                      className="w-full"
                      disabled={offsetY <= -canvasSize / 2}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-start-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOffsetX = Math.max(-canvasSize / 2, offsetX - 10);
                        setOffsetX(newOffsetX);
                      }}
                      className="w-full"
                      disabled={offsetX <= -canvasSize / 2}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-start-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOffsetX(0);
                        setOffsetY(0);
                      }}
                      className="w-full"
                      disabled={offsetX === 0 && offsetY === 0}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-start-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOffsetX = Math.min(canvasSize / 2, offsetX + 10);
                        setOffsetX(newOffsetX);
                      }}
                      className="w-full"
                      disabled={offsetX >= canvasSize / 2}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="col-start-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newOffsetY = Math.min(canvasSize / 2, offsetY + 10);
                        setOffsetY(newOffsetY);
                      }}
                      className="w-full"
                      disabled={offsetY >= canvasSize / 2}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem key="Scale">
              <div className="w-full flex flex-col gap-2 px-2 py-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="scale" className="text-sm whitespace-nowrap text-sidebar-foreground">
                    Scale:
                  </label>
                  <span className="text-sm text-muted-foreground">{scale.toFixed(2)}</span>
                </div>
                <input
                  id="scale"
                  type="range"
                  min={0.1}
                  max={3.0}
                  step={0.01}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-colors [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

