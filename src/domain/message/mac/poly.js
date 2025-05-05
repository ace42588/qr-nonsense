import sodium from "libsodium-wrappers";

export async function poly1305Mac(message, key) {
  await sodium.ready;
  const encoder = new TextEncoder();

  // Poly1305 requires 32-byte key
  const fullKey = sodium.crypto_generichash(32, encoder.encode(key));
  const mac = sodium.crypto_onetimeauth(
    encoder.encode(message),
    fullKey
  );
  return sodium.to_hex(mac).slice(0, 8); // Truncate to 4 bytes
}
