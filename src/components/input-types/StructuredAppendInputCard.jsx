import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/message-banner";

import { updateInput } from "@/state/inputs/inputActions";
import { useInputs } from "@/state/inputs/InputContext";
import { computeStructuredAppendParity } from "@/domain/qr/encoders/structuredAppend";

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function StructuredAppendInputCard({ input, dispatch, parseError }) {
  const { inputs } = useInputs();

  const symbolIndex = clampInt(input.symbolIndex, 0, 15, 0);
  const totalSymbols = clampInt(input.totalSymbols, 1, 16, 2);
  const parity = clampInt(input.parity, 0, 255, 0);

  const setField = (partial) => dispatch(updateInput(input.id, partial));

  const computeParity = () => {
    const payloads = inputs
      .filter((item) => item.id !== input.id && item.type !== "structuredAppend")
      .map((item) => item.data ?? item.text ?? "");
    setField({ parity: computeStructuredAppendParity(payloads) });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Structured Append
      </h3>
      {(parseError || input.error) && (
        <ErrorBanner message={parseError || input.error} title="Parse error" />
      )}

      <p className="text-xs text-muted-foreground">
        Emits the Structured Append header (mode 0011). Place this input before
        data segments. Each symbol in a set needs matching total and parity.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="sa-index">Symbol index (0–15)</Label>
          <Input
            id="sa-index"
            type="number"
            min={0}
            max={15}
            value={symbolIndex}
            onChange={(e) =>
              setField({
                symbolIndex: clampInt(e.target.value, 0, 15, 0),
              })
            }
          />
        </div>
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="sa-total">Total symbols (1–16)</Label>
          <Input
            id="sa-total"
            type="number"
            min={1}
            max={16}
            value={totalSymbols}
            onChange={(e) =>
              setField({
                totalSymbols: clampInt(e.target.value, 1, 16, 1),
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="sa-parity">Parity (0–255)</Label>
        <div className="flex gap-2">
          <Input
            id="sa-parity"
            type="number"
            min={0}
            max={255}
            value={parity}
            onChange={(e) =>
              setField({ parity: clampInt(e.target.value, 0, 255, 0) })
            }
          />
          <Button type="button" variant="outline" onClick={computeParity}>
            Compute
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ISO parity is the XOR of all Byte-mode payload bytes across the
          symbol set. Compute XORs UTF-8 bytes from the other inputs here.
        </p>
      </div>

      <div className="rounded bg-muted p-3 text-sm text-muted-foreground">
        Sequence {symbolIndex + 1}/{totalSymbols} · parity 0x
        {parity.toString(16).padStart(2, "0")}
      </div>
    </div>
  );
}
