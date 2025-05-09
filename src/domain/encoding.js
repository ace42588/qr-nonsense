const INPUT_TYPES = {Basic: "basic", JSON: "json", BitField: "bitField", MAC: "mac"};

const isBinary = (str) =>
  /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(str);
const isHex = (str) =>
  /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(str);

function parseByType(input) {
  switch (input.type) {
    case INPUT_TYPES.Basic: {
      
    }
    case INPUT_TYPES.JSON: {
      
    }
    case INPUT_TYPES.BitField: {
      
    }
    case INPUT_TYPES.MAC: {
      
    }
    default: {
      
    }
  }
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseInput(input) {
  console.debug("parseInput", { input });
  if (!input || !input.data || !input.mode) return {};
  let { mode, data, encoding } = input;

  switch (mode) {
    case "numeric": {
      const regex = /\d+/gm;
      const match = data.match(regex);
      return {...input, data: match ? match.join("") : ""};
    }
    case "alphanumeric": {
      const regex = /[0-9A-Z \$\%\*\+\-\.\/:]+/gm;
      let upperCase = data.toUpperCase();
      const match = upperCase.match(regex);
      return {...input, data: match ? match.join("") : ""};
    }
    default: {
      // default to byte
      if (encoding === "utf-8") {
        //console.debug("parsedInput", "Forcing UTF-8 interpretation for input");
        return { ...input };
      }
      if (isBinary(data) && encoding !== "hex") {
        //console.debug("parsedInput", "Interpreting input as binary...");
        let hex = "";
        let bin = data.replace(/^0b/i, "");
        bin = bin.replace(/\s+/g, "");

        for (let i = 0; i < bin.length; i += 4) {
          let val = parseInt(bin.substring(i, i + 4), 2);
          hex = hex.concat(val.toString(16));
        }
        return { mode, data: hex, encoding: "hex" };
      } else if (isHex(data)) {
        //console.debug("parsedInput", "Interpreting input as hex...");
        let hex = data.replace(/0x/gi, "");
        hex = hex.replace(/\s+/g, "");

        if (hex.length % 2 !== 0) {
          throw new Error("Invalid hex string: length must be even.");
        }
        return { mode, data: hex, encoding: "hex" };
      } else {
        console.log(
          "input value for byte mode did not match binary or hex encoding"
        );
        return { ...input, encoding: "utf-8" };
      }
    }
  }
}

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

export function encodeAll(inputs) {
  
}