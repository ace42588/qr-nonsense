import {
  hmacSha256Truncated,
  poly1305Mac,
  kmac128,
} from "./utils/macFunctions";

export const MAC_FUNCTIONS = {
  "HMAC-SHA256": hmacSha256Truncated,
  Poly1305: poly1305Mac,
  KMAC128: kmac128,
};

export function generateMAC(input) {
  const { algo, key, includedFields, inputs } = input;
  if (!algo || !key || !includedFields) return {};
  console.debug("generateMAC", {includedFields, inputs});

  const message = includedFields
    .map((id) => inputs?.[id]?.data)
    .join("");
  console.debug("generateMAC", {message});
  const fn = MAC_FUNCTIONS[algo];
  if (!fn) throw new Error(`Unknown MAC algorithm: ${algo}`);
  const mac = fn(message, key, 4); // returns hex
  return {
    mode: "byte",
    encoding: "hex",
    data: mac,
  };
}
