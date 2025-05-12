import { parseBasic } from "./inputParsers/parseBasic";
import { parseJson } from "./inputParsers/parseJson";
import { parseBitField } from "./inputParsers/parseBitField";
import { generateMAC } from "./inputParsers/generateMAC";
import { encodeInput } from "./qr/encoders";

const INPUT_PARSERS = {
  basic: parseBasic,
  byte: parseBasic,
  alphanumeric: parseBasic,
  numeric: parseBasic,
  json: parseJson,
  bitfield: parseBitField,
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
  console.debug("encodeAll", { inputs });
  const parsedInputs = inputs.map((input) => handleInput({ ...input, inputs }));
  return parsedInputs.flatMap(({ data, mode, encoding }) =>
    encodeInput(mode, data, encoding)
  );
}
