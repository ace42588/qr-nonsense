// UI Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

// State and Actions
import {
  setMacKey,
  setMacAlgorithm,
  setIncludedFields,
} from "@/state/inputs/inputActions";

// Domain
import { MAC_FN_NAMES } from "@/domain/input";

export function MacInputCard({ input, inputs, dispatch, preview }) {
  const selectedIds = input.includedFields || [];
  const selectableInputs = inputs.filter((i) => i.id !== input.id);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">QR MAC Generator</h3>
      <div className="space-y-1">
        <Label htmlFor="mac-key">Secret Key</Label>
        <Input
          id="mac-key"
          value={input.key}
          onChange={(e) => dispatch(setMacKey(input.id, e.target.value))}
          placeholder="Enter shared secret"
        />
      </div>

      <div className="space-y-2">
        <Label>Select Fields</Label>
        <div className="space-y-1 rounded border p-2">
          {selectableInputs.length > 0 ? (
            selectableInputs.map((i) => (
              <div key={i.id} className="flex items-center gap-2">
                <Checkbox
                  id={`chk-${i.id}`}
                  checked={selectedIds.includes(i.id)}
                  onCheckedChange={() => {
                    const next = selectedIds.includes(i.id)
                      ? selectedIds.filter((x) => x !== i.id)
                      : [...selectedIds, i.id];
                    dispatch(setIncludedFields(input.id, next));
                  }}
                />
                <Label htmlFor={`chk-${i.id}`}>{i.label || i.id}</Label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No fields available</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>MAC Algorithm</Label>
        <Select
          value={input.algo}
          onValueChange={(value) => dispatch(setMacAlgorithm(input.id, value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAC_FN_NAMES.map((alg) => (
              <SelectItem key={alg} value={alg}>
                {alg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="rounded bg-muted p-3 text-sm">
        <strong>MAC:</strong>{" "}
        <code className="text-muted-foreground">
          {preview?.data || "(calculating…)"}
        </code>
      </div>
    </div>
  );
}
