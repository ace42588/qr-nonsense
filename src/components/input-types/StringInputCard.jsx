// UI Components
import { useMemo } from "react";
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
import { ErrorBanner } from "@/components/ui/message-banner";

import { updateInput } from "../../state/inputs/inputActions";
import { useDerivedQRData } from "@/hooks/useDerivedQRData";
import { chooseMixedSegments } from "@/domain/qr/encoders/mixed";
import {
  CATEGORY_LABELS,
  optimizeInput,
} from "@/domain/qr/encoders/optimize";

// Constants
import { QR_MODES, QR_MODE_LABELS } from "./constants";

function previewOptimized(text) {
  if (text.length <= 96) return text;
  return `${text.slice(0, 93)}…`;
}

function eciAssignmentValue(encoding) {
  if (encoding === undefined || encoding === null || encoding === "") return "26";
  const s = String(encoding).trim().toLowerCase();
  if (s === "utf-8" || s === "utf8") return "26";
  return String(encoding);
}

export function StringInputCard({ input, dispatch }) {
  const { encodeError, versionInfo } = useDerivedQRData();
  const selectedMode = input.mode === "auto" ? "mixed" : input.mode || "byte";
  const isMixedLike =
    selectedMode === "mixed" || selectedMode === "optimized";
  const optimization = useMemo(
    () =>
      selectedMode === "optimized" && input.text
        ? optimizeInput(input.text)
        : null,
    [selectedMode, input.text]
  );
  const mixedParts = useMemo(() => {
    if (!isMixedLike || !input.text) return [];
    const source = optimization?.text ?? input.text;
    return chooseMixedSegments(source, versionInfo?.version ?? 1);
  }, [isMixedLike, input.text, optimization?.text, versionInfo?.version]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{input.label}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {encodeError && <ErrorBanner message={encodeError} title="Encoding error" />}
        <Select
          value={selectedMode}
          onValueChange={(mode) => {
            // Filter text to match the new mode when switching
            let filteredText = input.text || "";
            if (mode === "numeric" && filteredText) {
              filteredText = filteredText.replace(/\D/g, "");
            } else if (mode === "alphanumeric" && filteredText) {
              filteredText = filteredText.replace(/[^0-9A-Z $%*+\-./:]/gi, "").toUpperCase();
            }
            const patch = { mode, text: filteredText };
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

        {selectedMode === "mixed" && (
          <p className="text-xs text-muted-foreground">
            Splits the text into numeric, alphanumeric, byte, and kanji
            segments when that bitstream is shorter than byte mode alone.
            {mixedParts.length > 0 && (
              <>
                {" "}
                Using {mixedParts.map((part) => part.mode).join(" → ")}.
              </>
            )}
          </p>
        )}

        {selectedMode === "optimized" && (
          <p className="text-xs text-muted-foreground">
            Detects the payload type and uppercases case-insensitive parts
            before mixed encoding.
            {optimization && (
              <>
                {" "}
                Detected {CATEGORY_LABELS[optimization.category]}.
                {optimization.transformed && (
                  <> Encodes as {previewOptimized(optimization.text)}.</>
                )}
              </>
            )}
            {mixedParts.length > 0 && (
              <>
                {" "}
                Using {mixedParts.map((part) => part.mode).join(" → ")}.
              </>
            )}
          </p>
        )}

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

        {input.mode === "eci" && (
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
