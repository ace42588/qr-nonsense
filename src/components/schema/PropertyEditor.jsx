import { TypeSelector } from "./TypeSelector";

export function PropertyEditor({
  propertyKey,
  onKeyChange,
  schema,
  onChange,
  onDelete,
}) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 8, marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={propertyKey}
          onChange={(e) => onKeyChange(e.target.value)}
          style={{ fontWeight: "bold", fontSize: 14 }}
        />
        <TypeSelector value={schema.type} onChange={(t) => onChange({ ...schema, type: t })} />
        <button onClick={onDelete} style={{ color: "red", marginLeft: "auto" }}>
          Delete
        </button>
      </div>
    </div>
  );
}