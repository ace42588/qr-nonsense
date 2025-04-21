// {"p":"A","cc":"133","txn":"99999","i":[{"v":5432,"q":1},{"v":6666,"q":3},{"v":1234,"q":2}]}
const buildHeader = (txn, confId, platform) => {
  const PLATFORMS = ["A", "I", "W"]; // Android, iOS, Web
  let p = PLATFORMS.indexOf(platform);
  if (p === -1) p = 3;
  if (confId < 0 || confId > 255) {
    throw new Error("confId must be an 8-bit number (0-255).");
  }
  if (txn < 0 || txn > 1048575) {
    throw new Error("txn must be a 20-bit number (0-1048575).");
  }

  // Bit positions:
  // - Bits 31-30: Fixed format = 00
  // - Bits 29-28: Platform (2 bits)
  // - Bits 27-20: confId (8 bits)
  // - Bits 19-0 : txn (20 bits)
  const header =
    ((platform & 0x03) << 28) | // platform in bits 29-28
    ((confId & 0xff) << 20) | // confId in bits 27-20
    (txn & 0xfffff); // txn in bits 19-0

  // Convert the 32-bit header into a 4-byte array in big-endian order:
  const bytes = new Uint8Array(4);
  bytes[0] = (header >> 24) & 0xff; // Most significant byte (bits 31-24)
  bytes[1] = (header >> 16) & 0xff; // Next byte (bits 23-16)
  bytes[2] = (header >> 8) & 0xff; // Next byte (bits 15-8)
  bytes[3] = header & 0xff; // Least significant byte (bits 7-0)

  return bytes;
};

export function encode(order) {
  let { transactionId, conferenceCode, platform, items } = order;
  let hex = "";
  let headerBytes = buildHeader(transactionId, conferenceCode, platform);
  let itemsBytes = new Uint8Array(items.length * 3);
  items.forEach(({ v, q }, j) => {
    let idx = j * 3;
    const variantNum = parseInt(v);
    itemsBytes[idx] = variantNum & 0xff;
    itemsBytes[++idx] = (variantNum >> 8) & 0xff;
    itemsBytes[++idx] = parseInt(q) & 0xff;
  });

  hex = headerBytes.reduce((acc, curr) => {
    return acc.concat(curr.toString(16));
  }, hex);
  hex = itemsBytes.reduce((acc, curr) => {
    return acc.concat(curr.toString(16));
  }, hex);

  return hex;
}
