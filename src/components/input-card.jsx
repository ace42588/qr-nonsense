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
import { Switch } from "@/components/ui/switch";

import { QRModeSelect } from "@/components/qr-mode-select";

import { JsonInput } from "@/components/JsonInput";
import { BitFieldInput } from "@/components/BitFieldInput";
import { MACGenerator } from "@/components/MACGenerator";

function BasicInput({ input }) {
  const { updateInput } = useInputDispatch();
  const { text, mode, encoding } = input;

  const handleChange = (field, value) =>
    updateInput?.({ ...input, [field]: value });

  return (
    <div className="grid w-full items-center gap-4">
      <div className="flex flex-col space-y-1.5">
        <QRModeSelect input={input} />
      </div>
      <div className="flex flex-col space-y-1.5">
        <Label htmlFor="name">Text</Label>
        <Input
          id="name"
          type="text"
          value={text}
          onChange={(e) => handleChange("text", e.target.value)}
        />
      </div>
      {mode === "byte" && (
        <div className="flex items-center space-x-2">
          <Switch
            id="force-utf-8"
            onChange={(e) =>
              handleChange("encoding", e.target.checked ? "utf-8" : undefined)
            }
          />
          <Label htmlFor="force-utf-8">Force UTF-8</Label>
        </div>
      )}
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
  const { inputs, activeInputID } = useInputs();
  console.debug({activeInputID, inputs});
  const activeInput = inputs.find(({id}) => id == activeInputID);
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
