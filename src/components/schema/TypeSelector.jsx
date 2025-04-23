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
    <select
      multiple
      value={types}
      onChange={e => {
        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
        onChange(selected.length === 1 ? selected[0] : selected);
      }}
      style={{ minWidth: 120, height: 24 * JSON_SCHEMA_PRIMITIVES.length / 2, verticalAlign: "middle" }}
    >
      {JSON_SCHEMA_PRIMITIVES.map(type => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>
  );
}