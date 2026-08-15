const MODE_REGEX = {
  numeric: /^\d+$/g,
  alphanumeric: /^[0-9A-Z $%*+\-./:]+$/g,
};

const isBinary = (val) =>
  /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(val);

const isHex = (val) =>
  /^(?:0x)?(?:[0-9A-F]{1,}(?:\s+[0-9A-F]{1,})+|(?:[0-9A-F]{1,})+)$/i.test(val);

export function parseBasic(input) {
  const { mode, encoding } = input;
  // Canonical field is `data`; accept legacy `text` so UI and factory stay in sync.
  const text = input.data ?? input.text ?? "";

  if (!mode) return input;

  // Handle alphanumeric and numeric modes
  if (mode === "alphanumeric" || mode === "numeric") {
    const normalized = mode === "alphanumeric" ? text.toUpperCase() : text;
    const match = normalized.match(MODE_REGEX[mode]);
    return {
      ...input,
      data: match ? match.join("") : "",
    };
  }

  // Handle byte mode with binary or hex input
  if (mode === "byte") {
    if (encoding === "utf-8") return { ...input, data: text};
    if (isBinary(text) && encoding !== "hex") {
      const bin = text.replace(/^0b/i, "").replace(/\s+/g, "");
      let hex = "";

      for (let i = 0; i < bin.length; i += 4) {
        const val = parseInt(bin.substring(i, i + 4), 2);
        hex += val.toString(16);
      }

      return { ...input, data: hex, encoding: "hex" };
    }

    if (isHex(text)) {
      let hex = text.replace(/^0x/i, "").replace(/\s+/g, "");

      if (hex.length % 2 !== 0) hex = `0${hex}`;

      return { ...input, data: hex, encoding: "hex" };
    }

    // Fallback to UTF-8 if no known encoding matched
    // console.log("Input for byte mode did not match binary or hex.");
    return { ...input, data: text, encoding: "utf-8" };
  }

  if (mode === "kanji" || mode === "kanjiMode") {
    return { ...input, data: text };
  }

  // Mixed / optimized: keep the original text; the encoder chooses modes
  // and (for optimized) may rewrite case-insensitive payload parts.
  if (mode === "mixed" || mode === "auto" || mode === "optimized") {
    return { ...input, data: text };
  }

  if (mode === "eci") {
    const eciEncoding =
      encoding === undefined || encoding === null || encoding === ""
        ? "26"
        : encoding;
    return { ...input, data: text, encoding: eciEncoding };
  }

  // Unknown mode fallback
  return input;
}
