export function stringToBytes(input) {
  const encoder = new TextEncoder("utf-8");
  const byte = encoder.encode(input);
}

export function bytesToHexString(bytes) {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexStringToDecimal(str)