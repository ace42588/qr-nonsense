import { useState, useEffect } from "react";
import { useInputs, useInputDispatch } from "../../state";

import { QRModeSelect } from "./qr-mode-select";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function StringInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <div className="flex w-full items-center justify-between">
            <div className="text-base font-medium text-foreground">
              {activeItem?.title}
            </div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label>
          </div>
    <SidebarInput placeholder="Type to search..." value={text}
            onChange={(e) => handleChange("text", e.target.value)}/>

  );
}
