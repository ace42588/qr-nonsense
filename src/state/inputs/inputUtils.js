export function updateInputById(inputs, id, partial) {
  return inputs.map(input => {
    if (input.id !== id) return input;

    const merged = {
      ...input,
      ...partial,
    };

    if (partial.values) {
      merged.values = { ...input.values, ...partial.values };
    }

    if (!("layout" in partial)) {
      merged.layout = input.layout;
    }

    return merged;
  });
}

export function createInput(overrides = {}) {
  const {
    id = crypto.randomUUID(),
    type = "basic",
    label = "New Input",
    mode = "byte",
    text = "Hello world",
    encoding = "",
  } = overrides;

  return {
    id,
    type,
    label,
    mode,
    text,
    encoding,
    ...overrides, // allows adding extra custom fields
  };
}
