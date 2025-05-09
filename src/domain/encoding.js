// domain/encoding.js
import { MAC_FUNCTIONS, BitPacked, ModHex, NTRU } from "./message";

export function generateBitLayout(fields) {
  //console.debug("generateBitLayout", { fields });
  function bitsNeeded(max) {
    return max <= 0 ? 1 : Math.ceil(Math.log2(Number(max) + 1));
  }
  const withBits = fields.map((field) => ({
    ...field,
    bits: bitsNeeded(field.max),
  }));

  const totalBits = withBits.reduce((sum, field) => sum + field.bits, 0);

  let currentBit = totalBits - 1;
  const layout = withBits.map((field) => {
    const start = currentBit;
    const end = currentBit - field.bits + 1;
    currentBit -= field.bits;
    return {
      type: field.type,
      label: field.label,
      min: field.min,
      max: field.max,
      startBit: start,
      endBit: end,
      width: field.bits,
    };
  });

  return { layout, totalBits };
}

export function encodeFieldsToBytes(fieldsLayout, values) {
  //console.debug("encodeFieldsToBytes", { fieldsLayout, values });
  let result = 0;

  fieldsLayout.forEach((field) => {
    const value = values[field.label];
    if (value === undefined) {
      throw new Error(`Missing value for field: ${field.label}`);
    }
    if (value < field.min || value > field.max) {
      throw new Error(
        `Value for ${field.label} out of allowed range (${field.min} to ${field.max})`
      );
    }

    result |= (value & ((1 << field.width) - 1)) << field.endBit;
  });

  const totalBits = fieldsLayout[0].startBit + 1;
  const totalBytes = Math.ceil(totalBits / 8);

  const bytes = new Uint8Array(totalBytes);
  for (let i = 0; i < totalBytes; i++) {
    bytes[i] = (result >> (8 * (totalBytes - i - 1))) & 0xff;
  }

  return bytes;
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseInput({ mode = "byte", data = "", encoding }) {
  console.debug("parseInput", { mode, data, encoding });

  const MODE_REGEX = {
    numeric: /^\d+$/,
    alphanumeric: /^[0-9A-Z $%*+\-./:]+$/,
  };

  const isBinary = (val) =>
    /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(val);

  const isHex = (val) =>
    /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(val);

  if (!data || !mode) return {};

  // Handle alphanumeric and numeric modes
  if (mode === "alphanumeric" || mode === "numeric") {
    const normalized = mode === "alphanumeric" ? data.toUpperCase() : data;
    const match = normalized.match(MODE_REGEX[mode]);
    return {
      mode,
      encoding,
      data: match ? match.join("") : "",
    };
  }

  // Handle byte mode with binary or hex input
  if (mode === "byte") {
    if (isBinary(data) && encoding !== "hex") {
      const bin = data.replace(/^0b/i, "").replace(/\s+/g, "");
      let hex = "";

      for (let i = 0; i < bin.length; i += 4) {
        const val = parseInt(bin.substring(i, i + 4), 2);
        hex += val.toString(16);
      }

      return { mode, data: hex, encoding: "hex" };
    }

    if (isHex(data)) {
      let hex = data.replace(/^0x/i, "").replace(/\s+/g, "");

      if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string: length must be even.");
      }

      return { mode, data: hex, encoding: "hex" };
    }

    // Fallback to UTF-8 if no known encoding matched
    console.log("Input for byte mode did not match binary or hex.");
    return { mode, data, encoding: "utf-8" };
  }

  // Unknown mode fallback
  return { mode, data, encoding };
}

export function encodeJson(input, format = "None", fieldMap = {}) {
  const defaultFieldMap = {
    transactionKey: "transactionId",
    conferenceKey: "conferenceCode",
    platformKey: "platform",
    itemsKey: "items",
    variantKey: "variant",
    quantityKey: "quantity",
  };

  const fullMap = { ...defaultFieldMap, ...fieldMap };

  if (typeof input !== "object" || input == null) {
    return {
      data: String(input ?? ""),
      mode: "byte",
      encoding: "utf-8",
    };
  }

  const items =
    input[fullMap.itemsKey]?.map((item) => ({
      variant: item[fullMap.variantKey],
      quantity: item[fullMap.quantityKey],
    })) || [];

  const flatValues = [
    input[fullMap.transactionKey],
    input[fullMap.conferenceKey],
    input[fullMap.platformKey],
  ];

  switch (format) {
    case "Alphanumeric": {
      if (!Array.isArray(items)) {
        console.warn("Alphanumeric format requires input.items[]");
        return { data: "", mode: "alphanumeric" };
      }

      const encodedItems = items
        .map(({ variant, quantity }) => `${variant}:${quantity}`)
        .join("/");
      const data = `$1%${flatValues.join("%")}%${encodedItems}/$`;

      return {
        data,
        mode: "alphanumeric",
      };
    }

    case "PER": {
      const data = BitPacked.encode(input);
      return {
        data,
        mode: "byte",
        encoding: "hex",
      };
    }

    case "PER-ModHex": {
      let hex = BitPacked.encode(input);
      if (hex.length % 2 === 1) hex = `0${hex}`;
      const modhex = ModHex.encode(hex);
      return {
        data: modhex,
        mode: "alphanumeric",
        encoding: "modhex",
      };
    }

    case "PER-NTRU": {
      let hex = BitPacked.encode(input);
      const bytes = hex.match(/.{1,2}/g)?.map((h) => parseInt(h, 16)) ?? [];
      const moduli = bytes.map(() => 256);
      const encoded = NTRU.encode(bytes, moduli);
      return {
        data: encoded.join(""),
        mode: "alphanumeric",
        encoding: "ntru",
      };
    }

    case "None":
    default: {
      return {
        data: JSON.stringify(input),
        mode: "byte",
        encoding: "utf-8",
      };
    }
  }
}

const INPUT_PARSERS = {
  basic: parseInput,
  json: encodeJson,
  bitField: ({ fields = [], values = {} }) => {
    const { layout, totalBits } = generateBitLayout(fields);
    const encodedBytes = encodeFieldsToBytes(layout, values);
    return parseInput({
      mode: "byte",
      encoding: "utf-8",
      data: bytesToHex(encodedBytes),
    });
  },
  mac: ({ selectedInputs = [], key = "secret", algo = "HMAC-SHA256" }) => {
    const message = selectedInputs?.map((i) => i.data).join("");
    const fn = MAC_FUNCTIONS[algo];
    async function generateMAC() {
      const result = await fn(message, key, 4); // 4 bytes
      return result;
    }
    try {
      const result = generateMAC();
      return parseInput({
        mode: "byte",
        encoding: "utf-8",
        data: result,
      });
    } catch (e) {
      console.error(e);
    }
  },
};

export function encodeAll(inputs) {
  return inputs.map((input) => INPUT_PARSERS[input.type](input));
}
