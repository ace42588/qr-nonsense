import { parseBasic } from "./inputParsers/parseBasic";
import { parseJson } from "./inputParsers/parseJson";
import { parseBitField } from "./inputParsers/parseBitField";
import { generateMAC } from "./inputParsers/generateMAC";
import { encodeInput } from "./qr/encoders";

const INPUT_PARSERS = {
  basic: parseBasic,
  json: parseJson,
  bitField: parseBitField,
  mac: generateMAC,
};

async function handleInput(inputData) {
  console.debug("handleInput", {inputData});
  const encodeFn = INPUT_PARSERS[inputData.type];
  if (!encodeFn) throw new Error(`Unknown input type: ${inputData.type}`);
  const result = await encodeFn(inputData); 
  return result;
}

export async function parseAll(inputs) {
  console.debug("parseAll", {inputs});
  return Object.fromEntries(
    await Promise.all(
      inputs.map(async (input) => {
        const parsed = await handleInput({ ...input, inputs });
        return [input.id, parsed];
      })
    )
  );
}

export async function encodeAll(inputs) {
  const parsedInputs = await Promise.all(
      inputs.map(async (input) => {
        const parsed = await handleInput({ ...input, inputs });
        return parsed;
      }));
  const encodedInputs = parsedInputs.flatMap(({ data, mode, encoding }) =>
        encodeInput(data, mode, encoding)
      )
}
