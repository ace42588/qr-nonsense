export * as ModHex from "./modHex";
export * as NTRU from "./ntruPrime";

// Must match JSON_PARSERS keys in parseJson.js (FR-011).
export const ENCODING_STRATEGIES = [
  "None",
  "Alphanumeric",
  "PER",
  "PER-ModHex",
  "PER-NTRU",
];

export const ENCODING_ALIASES = {
  ModHex: "PER-ModHex",
  NTRU: "PER-NTRU",
  modhex: "PER-ModHex",
  ntru: "PER-NTRU",
};

export function resolveEncodingStrategy(encoding) {
  if (encoding == null || encoding === "") return "None";
  return ENCODING_ALIASES[encoding] || encoding;
}