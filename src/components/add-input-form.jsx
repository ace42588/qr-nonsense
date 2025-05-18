import { useState, useRef } from "react";

import { Plus } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar";

import { useInputs, useInputDispatch } from "../state";

export function AddInput({ ...props }) {
  const { inputs } = useInputs();
  const { addInput, reorderInputs } = useInputDispatch();
  const nextLabel = useRef(inputs?.length || 0);
  const [label, setLabel] = useState("");
  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent className="relative">
        <Label htmlFor="input" className="sr-only">
          Add
        </Label>
        <SidebarInput
          id="inputLabel"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add an input..."
          className="pl-8"
        />

        <Plus className="absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none" onClick={() => {
            addInput(label !== "" ? label : `Input ${nextLabel.current++}`);
            setLabel("");
          }}/>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
