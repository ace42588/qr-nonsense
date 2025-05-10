import { MAC_FUNCTIONS } from "./mac";
import { parseInput } from "./parseInput";

export async function generateMAC(input) {
  const { algo, key, includedFields, inputs } = input;
  if (!algo || !key || !includedFields) return "";

  const message = includedFields
    .map((id) => inputs.find((i) => i.id === id)?.data)
    .join("");
  const fn = MAC_FUNCTIONS[algo];
  if (!fn) throw new Error(`Unknown MAC algorithm: ${algo}`);
  const mac = await fn(message, key, 4); // returns hex
  return {
    mode: "byte",
    encoding: "utf-8",
    data: mac,
  };
}
