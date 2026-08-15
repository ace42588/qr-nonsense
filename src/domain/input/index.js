import { parseBasic } from "./parsers/parseBasic";
import { parseJson } from "./parsers/parseJson";
import { parseBitField } from "./parsers/parseBitField";
import { generateMAC } from "./parsers/generateMAC";
import { MAC_FUNCTIONS } from "./parsers/utils/macFunctions";
import {
  alphaNumericSchema,
  bitSchema,
  jsonSchema,
} from "./serializationSchemas";

const INPUT_PARSERS = {
  string: parseBasic,
  byte: parseBasic,
  alphanumeric: parseBasic,
  numeric: parseBasic,
  json: parseJson,
  bitfield: parseBitField,
  mac: generateMAC,
};

function handleInput(inputData) {
  if (inputData?.qartVariation) {
    return { ...inputData };
  }
  if (inputData?.error) {
    return { ...inputData };
  }
  const parserOpt = inputData.type || inputData.mode
  try {
    const encodeFn = INPUT_PARSERS[parserOpt];
    if (!encodeFn) throw new Error(`Unknown input type or mode: ${parserOpt}`);
    return encodeFn(inputData);
  } catch (err) {
    return {
      ...inputData,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function collectParseErrors(parsed) {
  const errors = {};
  for (const [id, value] of Object.entries(parsed || {})) {
    if (value?.error) {
      errors[id] = value.error;
    }
  }
  return errors;
}

export function parseAll(inputs) {
  const nonMacInputs = inputs.filter((input) => input.type !== "mac" && !input.qartVariation);
  const macInputs = inputs.filter((input) => input.type === "mac");
  const variationInputs = inputs.filter((input) => input.qartVariation);

  // First pass: parse non-MAC inputs
  const first = Object.fromEntries(
    nonMacInputs.map((input) => [input.id, handleInput({ ...input, inputs })])
  );

  // Second pass: parse MAC inputs with parsed non-MAC values available
  const second = Object.fromEntries(
    macInputs.map((input) => [
      input.id,
      handleInput({ ...input, inputs: first }),
    ])
  );

  const variations = Object.fromEntries(
    variationInputs.map((input) => [input.id, { ...input }])
  );

  const obj = Object.fromEntries(
    inputs.map(({ id }) => [id, { ...first, ...second, ...variations }[id]])
  );

  return obj;
}

export const predefinedSchemas = {
  bitSchema,
  jsonSchema,
  alphaNumericSchema,
};

export const MAC_FN_NAMES = Object.keys(MAC_FUNCTIONS);