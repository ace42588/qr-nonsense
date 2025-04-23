import { MultiSelectDropdown } from "../shared/MultiSelectDropdown";

const JSON_SCHEMA_PRIMITIVES = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
];

export function TypeSelector({ value, onChange }) {
  const types = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <MultiSelectDropdown
      options={JSON_SCHEMA_PRIMITIVES.map((e) => ({ label: e, value: e }))}
      label="Type"
      value={types}
      onChange={onChange}
    />
  );
}
