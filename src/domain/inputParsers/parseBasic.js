const MODE_REGEX = {
  numeric: /^\d+$/,
  alphanumeric: /^[0-9A-Z $%*+\-./:]+$/,
};

const isBinary = (val) =>
  /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(val);

const isHex = (val) =>
  /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(val);

export function parseBasic(input) {
  const { mode, data, encoding } = input;
  console.debug("parseBasic", { mode, data, encoding });

  if (!data || !mode) return input;

  // Handle alphanumeric and numeric modes
  if (mode === "alphanumeric" || mode === "numeric") {
    const normalized = mode === "alphanumeric" ? data.toUpperCase() : data;
    const match = normalized.match(MODE_REGEX[mode]);
    return {
      ...input,
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

      return { ...input, data: hex, encoding: "hex" };
    }

    if (isHex(data)) {
      let hex = data.replace(/^0x/i, "").replace(/\s+/g, "");

      if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex string: length must be even.");
      }

      return { ...input, data: hex, encoding: "hex" };
    }

    // Fallback to UTF-8 if no known encoding matched
    console.log("Input for byte mode did not match binary or hex.");
    return { ...input, encoding: "utf-8" };
  }

  // Unknown mode fallback
  return input;
}
