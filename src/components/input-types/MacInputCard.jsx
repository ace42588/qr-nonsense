import {
  Card, CardContent, CardHeader, CardTitle,
  Input, Label, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Separator, Checkbox
} from "../ui";
import {
  setMacKey, setMacAlgorithm, setIncludedFields
} from "../../state/inputs/inputActions";
import { MAC_FUNCTIONS } from "../../domain";

export function MacInputCard({ input, inputs, dispatch, preview }) {
  const selectedIds = input.includedFields || [];
  const selectableInputs = inputs.filter((i) => i.id !== input.id);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>QR MAC Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="space-y-1 border rounded p-2">
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
              <p className="text-muted-foreground text-sm">No fields available</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label>MAC Algorithm</Label>
          <Select
            value={input.algo}
            onValueChange={(value) => dispatch(setMacAlgorithm(input.id, value))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(MAC_FUNCTIONS).map((alg) => (
                <SelectItem key={alg} value={alg}>{alg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="text-sm bg-muted p-3 rounded">
          <strong>MAC:</strong>{" "}
          <code className="text-muted-foreground">
            {preview?.data || "(calculating…)"}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
