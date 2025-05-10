import { parseInput } from "./inputParsers/parseBasic";
import { encodeJson } from "./inputParsers/parseJson";
import { encodeBitField } from "./inputParsers/parseBitField";
import { generateMAC } from "./encodinputParsersers/generateMAC";

const INPUT_PARSERS = {
  basic: parseInput,
  json: encodeJson,
  bitField: encodeBitField,
  mac: generateMAC,
};

async function handleInput(inputData) {
  console.debug("handleInput", {inputData});
  const encodeFn = INPUT_PARSERS[inputData.type];
  if (!encodeFn) throw new Error(`Unknown input type: ${inputData.type}`);
  const result = await encodeFn(inputData); 
  return result;
}

export async function parseInputs(inputs) {
  console.debug("parseInputs", {inputs});
  return Object.fromEntries(
    await Promise.all(
      inputs.map(async (input) => {
        const encoded = await handleInput({ ...input, inputs });
        return [input.id, encoded];
      })
    )
  );
}
