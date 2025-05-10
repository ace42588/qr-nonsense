export function prepareHexString(input) {
  let hexInput = input.replace(/\s*/g, "").replace(/[^a-f0-9]/gi, "");
  // pad the front (assumes little endian) 
  return hexInput.padStart(Math.round(hexInput.length / 2) * 2, "0");
}

export function stringToBytes(input) {
  const encoder = new TextEncoder("utf-8");
  const byte = encoder.encode(input);
}

export function bytesToHex(bytes) {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(input) {
  const hexInput = prepareHexString(input)
  const hexBytes = hexInput.match(/[a-f0-9]{2}/gi);
  if (!hexBytes) return new Uint8Array(0);
  return Uint8Array.from(hexBytes, (h) => parseInt(h, 16));
}
