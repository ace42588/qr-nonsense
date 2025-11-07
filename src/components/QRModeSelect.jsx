import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useInputDispatch } from "@/state/inputs/InputContext";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function QRModeSelect({ input }) {
  const { updateInput } = useInputDispatch();
 
  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <Select defaultValue="byte">
      <SelectTrigger>
        <SelectValue placeholder="Select Mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Modes</SelectLabel>
          {modes.map((mode) => (
            <SelectItem className="capitalize" value={mode}>
              {mode}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
