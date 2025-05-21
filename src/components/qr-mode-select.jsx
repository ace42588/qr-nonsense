import { useState, useEffect } from "react";

import {
  ColumnsIcon,
  ChevronDownIcon
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useInputs, useInputDispatch } from "../state";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function QRModeSelect({ input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ColumnsIcon />
          <span className="hidden lg:inline">Change Mode</span>
          <span className="lg:hidden">Mode</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {modes.map((mode) => (
          <DropdownMenuItem className="capitalize">{mode}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
      <Select
        value={mode}
        onChange={(e) => handleChange("mode", e.target.value)}
      >
        <SelectTrigger
          className="@[767px]/card:hidden flex w-40"
          aria-label="Select a value"
        >
          <SelectValue placeholder="byte" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {modes.map((mode) => (
            <SelectItem value={mode} className="rounded-lg">
              {mode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DropdownMenu>
  );
}
