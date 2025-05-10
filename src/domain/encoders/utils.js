function prepareHexString(input) {
  let hexInput = input.replace(/\s*/g, "").replace(/[^a-f0-9]/gi, "");

  // even length ?
  if (hexInput.length % 2 !== 0) {
    // add a leading zero
    hexInput = `0${hexInput}`;
  }
  return hexInput;
}

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

export function hexStringToBytes(input) {
  const hexInput = prepareHexString(input)
  const hexBytes = hexInput.match(/[a-f0-9]{2}/gi);
  if (!hexBytes) return new Uint8Array(0);
  return Uint8Array.from(hexBytes, (h) => parseInt(h, 16));
}
