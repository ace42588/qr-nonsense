import { useEffect, useState } from "react";
import sodium from "libsodium-wrappers";
import { keccak_256 } from "js-sha3";

// --- MAC Functions ---

async function hmacSha256Truncated(message, key, length = 8) {
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

async function poly1305Mac(message, key) {
  await sodium.ready;
  const encoder = new TextEncoder();
  const fullKey = sodium.crypto_generichash(32, encoder.encode(key));
  const mac = sodium.crypto_onetimeauth(
    encoder.encode(message),
    fullKey
  );
  return sodium.to_hex(mac).slice(0, 8);
}

function kmac128(message, key, length = 8) {
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

const MAC_FUNCTIONS = {
  "HMAC-SHA256": hmacSha256Truncated,
  "Poly1305": poly1305Mac,
  "KMAC128": async (m, k, l) => kmac128(m, k, l),
};

// --- React Component ---

export default function MACGenerator() {
  const [data, setData] = useState({ txn: "99999", amt: "1337", user: "bob" });
  const [selectedFields, setSelectedFields] = useState(["txn", "amt"]);
  const [algorithm, setAlgorithm] = useState("HMAC-SHA256");
  const [secret, setSecret] = useState("supersecret");
  const [mac, setMac] = useState("");

  useEffect(() => {
    async function generateMAC() {
      const message = selectedFields.map(f => `${f}=${data[f]}`).join("&");
      const fn = MAC_FUNCTIONS[algorithm];
      const result = await fn(message, secret, 4); // 4 bytes
      setMac(result);
    }
    generateMAC();
  }, [data, selectedFields, algorithm, secret]);

  function toggleField(field) {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">QR MAC Generator</h2>

      <label className="block font-medium">Secret Key</label>
      <input
        className="border p-1 w-full mb-2"
        value={secret}
        onChange={e => setSecret(e.target.value)}
      />

      <label className="block font-medium">Select Fields</label>
      {Object.keys(data).map(key => (
        <label key={key} className="block">
          <input
            type="checkbox"
            checked={selectedFields.includes(key)}
            onChange={() => toggleField(key)}
          /> {key} = {data[key]}
        </label>
      ))}

      <label className="block font-medium mt-2">MAC Algorithm</label>
      <select
        className="border p-1 w-full mb-2"
        value={algorithm}
        onChange={e => setAlgorithm(e.target.value)}
      >
        {Object.keys(MAC_FUNCTIONS).map(alg => (
          <option key={alg} value={alg}>{alg}</option>
        ))}
      </select>

      <div className="bg-gray-100 p-2 rounded mt-4">
        <strong>MAC:</strong> <code>{mac}</code>
      </div>
    </div>
  );
}
