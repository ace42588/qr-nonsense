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

async function encodeInput(data) {
  console.debug("encodeInput", {data});
  const encodeFn = INPUT_PARSERS[data.type];
  if (!encodeFn) throw new Error(`Unknown input type: ${data.type}`);
  const result = await encodeFn(data); 
  return result;
}

export async function encodeAll(inputs) {
  console.debug("encodeAll", {inputs});
  return Object.fromEntries(
    await Promise.all(
      inputs.map(async (input) => {
        const encoded = await encodeInput({ ...input, inputs });
        return [input.id, encoded];
      })
    )
  );
}
