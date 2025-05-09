import { parseInput } from "./encoders/parseInput";
import { encodeJson } from "./encoders/encodeJson";
import { encodeBitField } from "./encoders/encodeBitField";
import { generateMAC } from "./encoders/generateMAC";

const INPUT_PARSERS = {
  basic: parseInput,
  json: encodeJson,
  bitField: encodeBitField,
  mac: generateMAC,
};

export function encodeAll(inputs) {
  return Promise.all(
    inputs.map(async (input) => {
      const encodeFn = INPUT_PARSERS[input.type];
      if (!encodeFn) throw new Error(`Unknown input type: ${input.type}`);
      const result = await encodeFn(input); // MAC is async now
      return result;
    })
  );
}
