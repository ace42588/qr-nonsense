import { useState, useEffect } from "react";

import { ColumnsIcon, ChevronDownIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dropdown-menu";

import { useInputs, useInputDispatch } from "../state";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function QRModeSelect({ input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <>
      <Label htmlFor="qrMode">Mode</Label>
      <DropdownMenu id="qrMode">
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
      </DropdownMenu>
    </>
  );
}
