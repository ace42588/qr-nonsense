// Collapsible, Nested JSON Schema Editor with Editable Keys and Multi-type Dropdowns
import React, { useRef, useState } from "react";
import { PropertyEditor } from "./PropertyEditor";

function useIdCounter() {
  const counter = useRef(0);
  const nextId = () => {
    counter.current += 1;
    return "id" + counter.current;
  };
  return nextId;
}

function inferType(val) {
  if (Array.isArray(val)) return "array";
  if (val === null) return "null";
  if (typeof val === "object") return "object";
  if (typeof val === "number")
    return Number.isInteger(val) ? "integer" : "number";
  if (typeof val === "boolean") return "boolean";
  return "string";
}

export function RecursiveSchemaEditor({
  value,
  onChange,
  title = "JSON Schema Editor",
}) {
  const nextId = useIdCounter();
  const [schema, setSchema] = useState(
    value || { type: "object", properties: {} }
  );
  const [collapsed, setCollapsed] = useState(false);
  const [codeView, setCodeView] = useState(false);
  const [raw, setRaw] = useState(JSON.stringify(schema, null, 2));
  const [error, setError] = useState("");

  // Synchronize raw code with schema
  React.useEffect(() => setRaw(JSON.stringify(schema, null, 2)), [schema]);

  function updateSchema(newSchema) {
    setSchema(newSchema);
    if (onChange) onChange(newSchema);
  }

  function handleRawChange(txt) {
    setRaw(txt);
    try {
      const obj = JSON.parse(txt);
      setSchema(obj);
      setError("");
      if (onChange) onChange(obj);
    } catch {
      setError("Invalid JSON");
    }
  }

  // Add top-level blank property
  const addBlankProperty = () => {
    let newKey = "newField";
    let counter = 1;
    const props = schema.properties || {};
    while (props.hasOwnProperty(newKey)) newKey = `newField${counter++}`;
    updateSchema({
      ...schema,
      properties: {
        ...props,
        [newKey]: { type: "string" },
      },
    });
  };

  return (
    <div
      style={{
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <strong>{title}</strong>
        <div>
          <button
            onClick={() => setCodeView((v) => !v)}
            style={{ marginRight: 8 }}
          >
            {codeView ? "Form View" : "Code Editor"}
          </button>
          <button onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>
      {!collapsed &&
        (codeView ? (
          <>
            <textarea
              value={raw}
              onChange={(e) => handleRawChange(e.target.value)}
              style={{ width: "100%", height: 350, fontFamily: "monospace" }}
              spellCheck={false}
            />
            {error && <div style={{ color: "red" }}>{error}</div>}
          </>
        ) : (
          <>
            <div>
              {schema.properties &&
                Object.entries(schema.properties).map(([key, subschema]) => (
                  <PropertyEditor
                    key={key}
                    propertyKey={key}
                    onKeyChange={(newKey) => {
                      const newProps = { ...schema.properties };
                      delete newProps[key];
                      newProps[newKey] = subschema;
                      updateSchema({ ...schema, properties: newProps });
                    }}
                    schema={subschema}
                    onChange={(newSub) => {
                      const newProps = { ...schema.properties, [key]: newSub };
                      updateSchema({ ...schema, properties: newProps });
                    }}
                    onDelete={() => {
                      const newProps = { ...schema.properties };
                      delete newProps[key];
                      updateSchema({ ...schema, properties: newProps });
                    }}
                    parentType="object"
                    nextId={nextId}
                  />
                ))}
            </div>
            <button onClick={addBlankProperty}>Add Property</button>
          </>
        ))}
    </div>
  );
}
