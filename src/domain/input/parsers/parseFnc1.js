const MODE_REGEX = {
  numeric: /^\d+$/,
  alphanumeric: /^[0-9A-Z $%*+\-./:]+$/,
};

/**
 * Parse an FNC1 / GS1 input into encoder fields.
 * @param {object} input
 * @returns {object}
 */
export function parseFnc1(input) {
  const position = input.fnc1Position === "second" ? "second" : "first";
  const payloadMode =
    input.payloadMode === "byte" || input.payloadMode === "numeric"
      ? input.payloadMode
      : "alphanumeric";
  const text = input.data ?? input.text ?? "";

  let data = text;
  if (payloadMode === "alphanumeric" && text) {
    data = text.toUpperCase();
    if (!MODE_REGEX.alphanumeric.test(data)) {
      return {
        ...input,
        data: "",
        mode: "fnc1",
        error:
          "Alphanumeric GS1 payload may only use 0-9 A-Z space $%*+-./: (use % as GS)",
      };
    }
  } else if (payloadMode === "numeric" && text) {
    if (!MODE_REGEX.numeric.test(text)) {
      return {
        ...input,
        data: "",
        mode: "fnc1",
        error: "Numeric payload may only contain digits 0-9",
      };
    }
    data = text;
  }

  if (position === "second") {
    const ai = input.applicationIndicator;
    if (ai === undefined || ai === null || String(ai).trim() === "") {
      return {
        ...input,
        data: "",
        mode: "fnc1",
        error: "FNC1 second position requires an application indicator",
      };
    }
  }

  return {
    ...input,
    data,
    text: data,
    mode: "fnc1",
    encoding: {
      position,
      applicationIndicator: input.applicationIndicator,
      payloadMode,
      byteEncoding:
        payloadMode === "byte" ? input.encoding || "utf-8" : undefined,
    },
    error: undefined,
  };
}
