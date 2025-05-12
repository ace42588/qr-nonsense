// state/utils.ts

export function updateInputById(inputs, id, partial) {
  return inputs.map(input => {
    if (input.id !== id) return input;

    return {
      ...input,
      ...partial,
      values: partial.values
        ? { ...input.values, ...partial.values }
        : input.values,
      layout: partial.layout ?? input.layout, // optional: avoid replacing arrays unnecessarily
    };
  });
}

export function createInput(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    type: "basic",
    label: "New Input",
    data: "",
    mode: "byte",
    text: "Hello world",
    ...overrides,
  };
}