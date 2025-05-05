// HMAC-SHA256 using Web Crypto API
export async function hmacSha256Truncated(message, key, length = 8) {
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
  return [...truncated].map(b => b.toString(16).padStart(2, "0")).join("");
}
