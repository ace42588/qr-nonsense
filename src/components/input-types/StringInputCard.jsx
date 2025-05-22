import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { updateInput } from "../../state/inputs/inputActions";

const modes = ["numeric", "alphanumeric", "byte", "kanji", "eci"];

export function StringInputCard({ input, dispatch }) {
  return (
    <Card>
      <CardHeader><CardTitle>{input.label}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <Select
          value={input.mode || "byte"}
          onValueChange={(mode) => dispatch(updateInput(input.id, { mode }))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {modes.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="text">Text</Label>
          <Input
            id="text"
            value={input.text}
            onChange={(e) =>
              dispatch(updateInput(input.id, { text: e.target.value }))
            }
          />
        </div>

        {input.mode === "byte" && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={input.encoding === "utf-8"}
              onCheckedChange={(checked) =>
                dispatch(updateInput(input.id, { encoding: checked ? "utf-8" : "" }))
              }
            />
            <Label>Force UTF-8</Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
