import { useQRDataDispatch, useInputDispatch, useInputs } from "../state";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { QRModeSelect } from "@/components/qr-mode-select";

import { JsonInput } from "@/components/JsonInput";
import { BitFieldInput } from "@/components/BitFieldInput";
import { MACGenerator } from "@/components/MACGenerator";

function BasicInput({ id, input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <div>
      <div className="input-group">
        <div className="label-select-checkbox-row">
          <label htmlFor="inputMode">Input Mode:</label>
          <QRModeSelect input={input} />
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
        <div className="input-button-row">
          <input
            type="text"
            value={text}
            onChange={(e) => handleChange("text", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

const INPUT_TYPES = {
  basic: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

export function InputCard() {
  const { activeInput } = useInputs();
  const InputComponent = INPUT_TYPES[activeInput.type];
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{activeInput.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <InputComponent id={activeInput.id} input={activeInput} />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
    );
}
