import { parseBasic } from "./parsers/parseBasic";
import { parseJson } from "./parsers/parseJson";
import { parseBitField } from "./parsers/parseBitField";
import { generateMAC } from "./parsers/generateMAC";

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
  //console.debug("handleInput", { inputData });
  const encodeFn = INPUT_PARSERS[inputData.type];
  if (!encodeFn) throw new Error(`Unknown input type: ${inputData.type}`);
  return encodeFn(inputData);
}

export function parseAll(inputs) {
  const nonMacInputs = inputs.filter((input) => input.type !== "mac");
  const macInputs = inputs.filter((input) => input.type === "mac");

  // First pass: parse non-MAC inputs
  const parsed = Object.fromEntries(
    nonMacInputs.map((input) => [input.id, handleInput({ ...input, inputs })])
  );

  // Second pass: parse MAC inputs with parsed non-MAC values available
  for (const input of macInputs) {
    parsed[input.id] = handleInput({ ...input, inputs }, parsed);
  }

  return parsed;
}
