import { useState, useEffect } from "react";
import { useInputs, useInputDispatch } from "../../state";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];


<div className="label-select-checkbox-row">
          <label htmlFor="inputMode">Input Mode:</label>
          <select
            id="inputMode"
            value={mode}
            onChange={(e) => handleChange("mode", e.target.value)}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {mode === "byte" && (
            <>
              <label htmlFor="forceUtf8">Force UTF-8</label>
              <input
                id="forceUtf8"
                type="checkbox"
                checked={encoding === "utf-8"}
                onChange={(e) =>
                  handleChange(
                    "encoding",
                    e.target.checked ? "utf-8" : undefined
                  )
                }
              />
            </>
          )}
        </div>

export function QRModeSelect({input, id}) {
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
          {modes.map((mode) => {
              return (
                <DropdownMenuItem className="capitalize">{mode}</DropdownMenuItem>
              );
            })}
        </DropdownMenuContent>
      <Select
            value={mode}
            onChange={(e) => handleChange("mode", e.target.value)}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
      <Select value={mode} onValueChange={(e) => handleChange("mode", e.target.value)}>
            <SelectTrigger
              className="@[767px]/card:hidden flex w-40"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Basic" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="basic" className="rounded-lg">
                Basic
              </SelectItem>
              <SelectItem value="halftone" className="rounded-lg">
                Halftone
              </SelectItem>
            </SelectContent>
          </Select>
      </DropdownMenu>
  );
}
