// UI Components
import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/message-banner";

import { setInputs, updateInput } from "../../state/inputs/inputActions";
import { createInput } from "../../state/inputs/inputFactory";
import { useInputs } from "@/state/inputs/InputContext";
import { useDerivedQRData } from "@/hooks/useDerivedQRData";
import { planOptimizedParts } from "@/domain/qr/encoders/optimize";

// Constants
import { QR_MODES, QR_MODE_LABELS } from "./constants";

const LEGACY_MIXED_MODES = new Set(["mixed", "optimized", "auto"]);

function eciAssignmentValue(encoding) {
  if (encoding === undefined || encoding === null || encoding === "") return "26";
  const s = String(encoding).trim().toLowerCase();
  if (s === "utf-8" || s === "utf8") return "26";
  return String(encoding);
}

function stringValue(input) {
  return input.data ?? input.text ?? "";
}

function normalizeMode(mode) {
  if (!mode || LEGACY_MIXED_MODES.has(mode)) return "byte";
  return mode;
}

function labelsForParts(baseLabel, parts) {
  if (parts.length <= 1) return [baseLabel];
  const modeCounts = parts.reduce((acc, part) => {
    acc[part.mode] = (acc[part.mode] || 0) + 1;
    return acc;
  }, {});
  const modeSeen = {};
  return parts.map((part) => {
    if (modeCounts[part.mode] === 1) {
      return `${baseLabel} · ${part.mode}`;
    }
    modeSeen[part.mode] = (modeSeen[part.mode] || 0) + 1;
    return `${baseLabel} · ${part.mode} ${modeSeen[part.mode]}`;
  });
}

export function StringInputCard({ input, dispatch, parseError }) {
  const { inputs } = useInputs();
  const { encodeError, versionInfo } = useDerivedQRData();
  const selectedMode = normalizeMode(input.mode);
  const value = stringValue(input);
  const canOptimize = Boolean(value) && input.qartVariation !== true;

  useEffect(() => {
    if (!LEGACY_MIXED_MODES.has(input.mode)) return;
    dispatch(
      updateInput(input.id, {
        mode: "byte",
        encoding: input.encoding || "utf-8",
      })
    );
  }, [dispatch, input.encoding, input.id, input.mode]);

  const setText = (text) =>
    dispatch(updateInput(input.id, { text, data: text }));

  const handleOptimize = () => {
    if (!canOptimize) return;

    const { parts } = planOptimizedParts(value, {
      version: versionInfo?.version ?? 1,
    });
    if (parts.length === 0) return;

    const baseLabel = input.label || "Input";
    const labels = labelsForParts(baseLabel, parts);
    const index = inputs.findIndex((item) => item.id === input.id);
    const at = index >= 0 ? index : inputs.length;

    const replacements = parts.map((part, i) =>
      createInput({
        id: i === 0 ? input.id : undefined,
        label: labels[i],
        text: part.data,
        mode: part.mode,
        encoding: part.mode === "byte" ? "utf-8" : "",
      })
    );

    const nextInputs = [
      ...inputs.slice(0, at),
      ...replacements,
      ...inputs.slice(at + 1),
    ];

    dispatch(
      setInputs({
        inputs: nextInputs,
        activeInputID: replacements[0].id,
      })
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {(parseError || input.error) && (
          <ErrorBanner message={parseError || input.error} title="Parse error" />
        )}
        {encodeError && <ErrorBanner message={encodeError} title="Encoding error" />}
        <Select
          value={selectedMode}
          onValueChange={(mode) => {
            // Filter text to match the new mode when switching
            let filteredText = stringValue(input);
            if (mode === "numeric" && filteredText) {
              filteredText = filteredText.replace(/\D/g, "");
            } else if (mode === "alphanumeric" && filteredText) {
              filteredText = filteredText.replace(/[^0-9A-Z $%*+\-./:]/gi, "").toUpperCase();
            }
            const patch = { mode, text: filteredText, data: filteredText };
            if (mode === "eci") {
              const current = eciAssignmentValue(input.encoding);
              patch.encoding = /^\d+$/.test(current) ? current : "26";
            }
            dispatch(updateInput(input.id, patch));
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QR_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {QR_MODE_LABELS[m] || m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="text">Text</Label>
          <Input
            id="text"
            value={value}
            onChange={(e) => setText(e.target.value)}
            disabled={input.qartVariation === true}
            className={input.qartVariation === true ? "bg-muted cursor-not-allowed" : ""}
            title={input.qartVariation === true ? "QArt variation input - value is controlled by Variation Template" : ""}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={!canOptimize}
            onClick={handleOptimize}
          >
            Optimize
          </Button>
        </div>

        {selectedMode === "byte" && (
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

        {selectedMode === "eci" && (
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="eci-assignment">ECI assignment</Label>
            <Input
              id="eci-assignment"
              type="number"
              min={0}
              max={999999}
              value={eciAssignmentValue(input.encoding)}
              onChange={(e) =>
                dispatch(updateInput(input.id, { encoding: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Default 26 is UTF-8. The payload is encoded in that character set after the ECI designator.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
