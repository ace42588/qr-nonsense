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
import { ErrorBanner } from "@/components/ui/message-banner";

import { updateInput } from "@/state/inputs/inputActions";

const PAYLOAD_MODES = ["alphanumeric", "byte", "numeric"];

function stringValue(input) {
  return input.data ?? input.text ?? "";
}

export function Fnc1InputCard({ input, dispatch, parseError }) {
  const position = input.fnc1Position === "second" ? "second" : "first";
  const payloadMode = PAYLOAD_MODES.includes(input.payloadMode)
    ? input.payloadMode
    : "alphanumeric";
  const value = stringValue(input);

  const setField = (partial) => dispatch(updateInput(input.id, partial));

  const setText = (text) => {
    let next = text;
    if (payloadMode === "alphanumeric") {
      next = text.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, "");
    } else if (payloadMode === "numeric") {
      next = text.replace(/\D/g, "");
    }
    setField({ text: next, data: next });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">FNC1 / GS1</h3>
      {(parseError || input.error) && (
        <ErrorBanner message={parseError || input.error} title="Parse error" />
      )}

      <div className="flex flex-col space-y-1.5">
        <Label>FNC1 position</Label>
        <Select
          value={position}
          onValueChange={(fnc1Position) => setField({ fnc1Position })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first">First (GS1)</SelectItem>
            <SelectItem value="second">Second (AIM)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          First position marks a GS1 element string. Second position is for
          AIM industry applications and needs an application indicator.
        </p>
      </div>

      {position === "second" && (
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="fnc1-ai">Application indicator</Label>
          <Input
            id="fnc1-ai"
            value={String(input.applicationIndicator ?? "")}
            onChange={(e) => setField({ applicationIndicator: e.target.value })}
            placeholder="00 or A"
          />
          <p className="text-xs text-muted-foreground">
            Two-digit 00–99, a single letter A–Z, or raw 0–255.
          </p>
        </div>
      )}

      <div className="flex flex-col space-y-1.5">
        <Label>Payload mode</Label>
        <Select
          value={payloadMode}
          onValueChange={(nextMode) => {
            let next = value;
            if (nextMode === "alphanumeric" && next) {
              next = next.toUpperCase().replace(/[^0-9A-Z $%*+\-./:]/g, "");
            } else if (nextMode === "numeric" && next) {
              next = next.replace(/\D/g, "");
            }
            setField({
              payloadMode: nextMode,
              text: next,
              data: next,
              encoding: nextMode === "byte" ? input.encoding || "utf-8" : input.encoding,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYLOAD_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="fnc1-payload">
          {position === "first" ? "GS1 element string" : "Payload"}
        </Label>
        <Input
          id="fnc1-payload"
          value={value}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            payloadMode === "alphanumeric"
              ? "0101234567890128%10ABC"
              : "Payload"
          }
        />
        {payloadMode === "alphanumeric" && (
          <p className="text-xs text-muted-foreground">
            In alphanumeric + FNC1, <code>%</code> encodes the GS1 group
            separator between AIs.
          </p>
        )}
      </div>

      {payloadMode === "byte" && (
        <div className="flex items-center space-x-2">
          <Switch
            checked={input.encoding === "utf-8"}
            onCheckedChange={(checked) =>
              setField({ encoding: checked ? "utf-8" : "" })
            }
          />
          <Label>Force UTF-8</Label>
        </div>
      )}
    </div>
  );
}
