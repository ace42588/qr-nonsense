// Collapsible, Nested JSON Schema Editor with Editable Keys and Multi-type Dropdowns
import React, { useState } from "react";

const JSON_SCHEMA_PRIMITIVES = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
];

function inferType(val) {
  if (Array.isArray(val)) return "array";
  if (val === null) return "null";
  if (typeof val === "object") return "object";
  if (typeof val === "number") return Number.isInteger(val) ? "integer" : "number";
  if (typeof val === "boolean") return "boolean";
  return "string";
}

function TypeSelector({ value, onChange }) {
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

function PropertyEditor({
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

export default function RecursiveSchemaEditor({
  value,
  onChange,
  title = "JSON Schema Editor",
}) {
  const [schema, setSchema] = useState(value || { type: "object", properties: {} });
  const [collapsed, setCollapsed] = useState(false);

  const updateSchema = (newSchema) => {
    setSchema(newSchema);
    if (onChange) onChange(newSchema);
  };

  const updateProperty = (oldKey, newKey, newSubSchema) => {
    const newProps = { ...schema.properties };
    delete newProps[oldKey];
    newProps[newKey] = newSubSchema;
    updateSchema({ ...schema, properties: newProps });
  };

  const deleteProperty = (key) => {
    const newProps = { ...schema.properties };
    delete newProps[key];
    updateSchema({ ...schema, properties: newProps });
  };

  const addBlankProperty = () => {
    let newKey = "newField";
    let counter = 1;
    while (schema.properties.hasOwnProperty(newKey)) {
      newKey = `newField${counter++}`;
    }
    updateSchema({
      ...schema,
      properties: {
        ...schema.properties,
        [newKey]: { type: "string" },
      },
    });
  };

  return (
    <div style={{ border: "1px solid #aaa", borderRadius: 8, padding: 16, maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{title}</strong>
        <button onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
      {!collapsed && (
        <>
          <div>
            {Object.entries(schema.properties || {}).map(([key, subschema]) => (
              <PropertyEditor
                key={key}
                propertyKey={key}
                schema={subschema}
                onKeyChange={(newKey) => updateProperty(key, newKey, subschema)}
                onChange={(newSub) => updateProperty(key, key, newSub)}
                onDelete={() => deleteProperty(key)}
              />
            ))}
          </div>
          <button onClick={addBlankProperty}>Add Property</button>
        </>
      )}
    </div>
  );
}
