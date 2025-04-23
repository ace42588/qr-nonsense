// Collapsible, Nested JSON Schema Editor with Editable Keys and Multi-type Dropdowns
import React, { useState } from "react";
import { PropertyEditor } from "./PropertyEditor";

function inferType(val) {
  if (Array.isArray(val)) return "array";
  if (val === null) return "null";
  if (typeof val === "object") return "object";
  if (typeof val === "number") return Number.isInteger(val) ? "integer" : "number";
  if (typeof val === "boolean") return "boolean";
  return "string";
}

export function RecursiveSchemaEditor({
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
