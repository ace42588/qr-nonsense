import { useState, useEffect } from "react";
import { SidebarInput } from "@/components/ui/sidebar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useInputs, useInputDispatch } from "../state";

import { QRModeSelect } from "./qr-mode-select";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function StringInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="text-base font-medium text-foreground">
          {input?.label}
        </div>
        <Label className="flex items-center gap-2 text-sm">
          <span>Force UTF-8</span>
          <Switch className="shadow-none" />
        </Label>
      </div>
      <SidebarInput
        placeholder="Hello world"
        value={text}
        onChange={(e) => handleChange("text", e.target.value)}
      />
    </>
  );
}
