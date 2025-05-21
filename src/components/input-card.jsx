import { useQRDataDispatch, useInputDispatch, useInputs } from "../state";

import { BasicInput } from "@/components/BasicInput";
import { JsonInput } from "@/components/JsonInput";
import { BitFieldInput } from "@/components/BitFieldInput";
import { MACGenerator } from "@/components/MACGenerator";

const INPUT_TYPES = {
  basic: BasicInput,
  json: JsonInput,
  bitfield: BitFieldInput,
  mac: MACGenerator,
};

export function InputCard() {
  const { activeInput } = useInputs();
  const InputComponent = INPUT_TYPES[activeInput.type];
  return <InputComponent id={activeInput.id} input={activeInput} />;
}
