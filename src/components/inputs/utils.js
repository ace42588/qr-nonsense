export const INPUT_TYPES = ["basic", "json", "bitField", "mac"];

// ENCAPSULATOR = "$";
// FIELD_SEPARATOR = "%";
// QTY_SEPARATOR = ":";
// TERMINATOR = "/";

const defaultFieldMap = {
  transactionKey: "transactionId",
  conferenceKey: "conferenceCode",
  platformKey: "platform",
  itemsKey: "items",
  variantKey: "variant",
  quantityKey: "quantity",
};

export function encodeJson(input, format = "None", fieldMap = {}) {
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
