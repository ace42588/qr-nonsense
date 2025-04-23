export function TypeSelector({ value, onChange }) {
  const types = Array.isArray(value) ? value : value ? [value] : [];

  const toggleType = (type) => {
    const exists = types.includes(type);
    const updated = exists ? types.filter(t => t !== type) : [...types, type];
    onChange(updated.length === 1 ? updated[0] : updated);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {JSON_SCHEMA_PRIMITIVES.map((type) => (
        <label
          key={type}
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid #ccc",
            cursor: "pointer",
            backgroundColor: types.includes(type) ? "#007acc" : "#f5f5f5",
            color: types.includes(type) ? "white" : "black",
          }}
        >
          <input
            type="checkbox"
            value={type}
            checked={types.includes(type)}
            onChange={() => toggleType(type)}
            style={{ display: "none" }}
          />
          {type}
        </label>
      ))}
    </div>
  );
}