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

function handleInput(inputData) {
  console.debug("handleInput", { inputData });
  const encodeFn = INPUT_PARSERS[inputData.type];
  if (!encodeFn) throw new Error(`Unknown input type: ${inputData.type}`);
  return encodeFn(inputData);
}

export function parseAll(inputs) {
  console.debug("parseAll", { inputs });
  return Object.fromEntries(
    inputs.map((input) => [input.id, handleInput({ ...input, inputs })])
  );
}

export function encodeAll(inputs) {
  const parsedInputs = inputs.map((input) => handleInput({ ...input, inputs }));
  const encodedInputs = parsedInputs.flatMap(({ data, mode, encoding }) =>
    encodeInput(data, mode, encoding)
  );
}
