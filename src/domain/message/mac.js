import sodium from "libsodium-wrappers-sumo";
import { keccak_256 } from "js-sha3";

export async function hmacSha256Truncated(message, key, length = 8) {
  console.debug("hmacSha256Truncated", {message, key, length});
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const truncated = new Uint8Array(sig).slice(0, length);
  return [...truncated].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function poly1305Mac(message, key) {
  await sodium.ready;
  const encoder = new TextEncoder();
  const fullKey = sodium.crypto_generichash(32, encoder.encode(key));
  const mac = sodium.crypto_onetimeauth(encoder.encode(message), fullKey);
  return sodium.to_hex(mac).slice(0, 8);
}

export function kmac128(message, key, length = 8) {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const msgBytes = encoder.encode(message);
  // Simple KMAC simulation using Keccak-256(key || message)
  const concat = new Uint8Array(keyBytes.length + msgBytes.length);
  concat.set(keyBytes);
  concat.set(msgBytes, keyBytes.length);
  const hashHex = keccak_256(concat);
  return hashHex.slice(0, length * 2); // hex string
}

export const MAC_FUNCTIONS = {
  "HMAC-SHA256": hmacSha256Truncated,
  Poly1305: poly1305Mac,
  KMAC128: async (m, k, l) => kmac128(m, k, l),
};
