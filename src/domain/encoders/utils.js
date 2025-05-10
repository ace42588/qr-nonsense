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

export function hexStringToBytes(str) {
  str = prepareHexString(str)
  const bytes = new Uint8Array(str.length/2);
  for (let i = 0; i < str.length; i += 2) {
    const byte = parseInt(str.substring(i, i + 2), 16);
  }
}
