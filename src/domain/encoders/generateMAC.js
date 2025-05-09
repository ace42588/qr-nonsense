import { MAC_FUNCTIONS } from "./mac";
import parseInput from "./parseInput";

export default async function generateMAC({
  selectedInputs = [],
  key = "secret",
  algo = "HMAC-SHA256",
}) {
  const fn = MAC_FUNCTIONS[algo];
  if (!fn) throw new Error(`Unknown MAC algorithm: ${algo}`);
  const message = selectedInputs.map((i) => i.data).join("");

  const mac = await fn(message, key, 4); // returns hex
  return parseInput({
    mode: "byte",
    encoding: "utf-8",
    data: mac,
  });
}
