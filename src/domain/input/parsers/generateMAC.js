import {
  MAC_FUNCTIONS
} from "./utils/macFunctions";
import { log } from "@/lib/logger";

export function generateMAC(input) {
  const { algo, key, includedFields, inputs } = input;
  if (!algo || !key || !includedFields) return {};
  log.debug("generateMAC", { includedFields, inputs });

  const message = includedFields
    .map((id) => inputs?.[id]?.data)
    .join("");
  log.debug("generateMAC", { message });
  const fn = MAC_FUNCTIONS[algo];
  if (!fn) throw new Error(`Unknown MAC algorithm: ${algo}`);
  const mac = fn(message, key, 4); // returns hex
  return {
    mode: "byte",
    encoding: "hex",
    data: mac,
  };
}
