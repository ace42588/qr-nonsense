import { keccak_256 } from "js-sha3";
import sodium from "libsodium-wrappers-sumo";

export function hmacSha256Truncated(message, key, length = 8) {
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const keyBytes = encoder.encode(key);

  // HMAC-SHA256 using sodium
  const mac = sodium.crypto_auth_hmacsha256(msgBytes, keyBytes);

  const truncated = mac.slice(0, length);
  return sodium.to_hex(truncated);
}

export function poly1305Mac(message, key, length = 8) {
  const encoder = new TextEncoder();
  const fullKey = sodium.crypto_generichash(32, encoder.encode(key));
  const mac = sodium.crypto_onetimeauth(encoder.encode(message), fullKey);
  return sodium.to_hex(mac).slice(0, length * 2);
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
