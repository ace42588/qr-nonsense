import { buildTemplatePayload } from "../templates";

/**
 * Parse a template input into QR encoder fields.
 * @param {object} input
 * @returns {object}
 */
export function parseTemplate(input) {
  const kind = input.template || "wifi";
  const fields = input.templateFields || {};

  try {
    const data = buildTemplatePayload(kind, fields);
    return {
      ...input,
      data,
      mode: "byte",
      encoding: "utf-8",
      error: undefined,
    };
  } catch (err) {
    return {
      ...input,
      data: "",
      mode: "byte",
      encoding: "utf-8",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
