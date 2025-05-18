import { Plus } from "lucide-react"

import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"

export function AddInput({ ...props }) {
  return (
    <form {...props}>
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
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Input Label"
            required
          />

          <button
            onClick={() => {
              addInput(label !== "" ? label : `Input ${nextLabel.current++}`);
              setLabel("");
            }}
          >
          <Plus className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
