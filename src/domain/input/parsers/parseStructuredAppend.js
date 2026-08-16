/**
 * Parse a Structured Append header input into encoder fields.
 * @param {object} input
 * @returns {object}
 */
export function parseStructuredAppend(input) {
  const symbolIndex = Number(input.symbolIndex ?? 0);
  const totalSymbols = Number(input.totalSymbols ?? 1);
  const parity = Number(input.parity ?? 0);

  if (!Number.isInteger(symbolIndex) || symbolIndex < 0 || symbolIndex > 15) {
    return {
      ...input,
      data: "",
      mode: "structuredAppend",
      error: `Symbol index must be an integer 0–15, got ${input.symbolIndex}`,
    };
  }
  if (
    !Number.isInteger(totalSymbols) ||
    totalSymbols < 1 ||
    totalSymbols > 16
  ) {
    return {
      ...input,
      data: "",
      mode: "structuredAppend",
      error: `Total symbols must be an integer 1–16, got ${input.totalSymbols}`,
    };
  }
  if (symbolIndex >= totalSymbols) {
    return {
      ...input,
      data: "",
      mode: "structuredAppend",
      error: `Symbol index (${symbolIndex}) must be less than total symbols (${totalSymbols})`,
    };
  }
  if (!Number.isInteger(parity) || parity < 0 || parity > 255) {
    return {
      ...input,
      data: "",
      mode: "structuredAppend",
      error: `Parity must be an integer 0–255, got ${input.parity}`,
    };
  }

  return {
    ...input,
    data: "",
    mode: "structuredAppend",
    encoding: { symbolIndex, totalSymbols, parity },
    error: undefined,
  };
}
