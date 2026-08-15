import { createInput } from "@/state/inputs/inputFactory";

const ECI_ENCODING_LABELS = {
  3: "ISO-8859-1",
  4: "ISO-8859-2",
  26: "utf-8",
};

export function encodingFromEci(assignmentNumber) {
  if (assignmentNumber == null) return "";
  return ECI_ENCODING_LABELS[assignmentNumber] ?? String(assignmentNumber);
}

function textFromChunk(chunk) {
  if (chunk.text != null && chunk.text !== "") return chunk.text;
  if (chunk.bytes?.length) {
    return new TextDecoder().decode(Uint8Array.from(chunk.bytes));
  }
  return "";
}

/**
 * Convert a jsQR decode result into app Input records.
 * ECI chunks set encoding for the following data segment.
 */
export function inputsFromScan(code) {
  const chunks = Array.isArray(code?.chunks) ? code.chunks : [];
  const inputs = [];
  let pendingEncoding = "";

  for (const chunk of chunks) {
    if (!chunk || chunk.type === "eci") {
      pendingEncoding = encodingFromEci(chunk?.assignmentNumber);
      continue;
    }

    const text = textFromChunk(chunk);
    if (text === "") continue;

    const mode = chunk.type || "byte";
    inputs.push(
      createInput({
        label: `Scanned ${inputs.length}`,
        data: text,
        mode,
        encoding: mode === "byte" ? pendingEncoding || "utf-8" : "",
      })
    );
    pendingEncoding = "";
  }

  if (inputs.length === 0 && code?.data) {
    inputs.push(
      createInput({
        label: "Scanned 0",
        data: code.data,
        mode: "byte",
        encoding: "utf-8",
      })
    );
  }

  return inputs;
}
