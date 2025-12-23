// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// State and Actions
import { updateInput } from "../../state/inputs/inputActions";

// Constants
import { QR_MODES } from "./constants";

export function StringInputCard({ input, dispatch }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Select
          value={input.mode || "byte"}
          onValueChange={(mode) => {
            // Filter text to match the new mode when switching
            let filteredText = input.text || "";
            if (mode === "numeric" && filteredText) {
              // Only keep digits
              filteredText = filteredText.replace(/\D/g, "");
            } else if (mode === "alphanumeric" && filteredText) {
              // Only keep alphanumeric characters and allowed symbols
              filteredText = filteredText.replace(/[^0-9A-Z $%*+\-./:]/gi, "").toUpperCase();
            }
            dispatch(updateInput(input.id, { mode, text: filteredText }));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QR_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
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
            disabled={input.qartVariation === true}
            className={input.qartVariation === true ? "bg-muted cursor-not-allowed" : ""}
            title={input.qartVariation === true ? "QArt variation input - value is controlled by Variation Template" : ""}
          />
        </div>

        {input.mode === "byte" && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={input.encoding === "utf-8"}
              onCheckedChange={(checked) =>
                dispatch(
                  updateInput(input.id, { encoding: checked ? "utf-8" : "" })
                )
              }
            />
            <Label>Force UTF-8</Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
