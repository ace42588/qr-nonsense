// Collapsible, Nested JSON Schema Editor with Editable Keys and Multi-type Dropdowns
import React, { useEffect, useRef, useState } from "react";
import { PropertyEditor } from "./PropertyEditor";
import { addBlankProperty, arrayToObject, objectToArray } from "./schemaUtils";

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
  title = "Schema Editor",
}) {
  const nextId = useIdCounter();
  const [schema, setSchema] = useState(() => {
    const initial = value || { type: "object", properties: {} };
    return {
      ...initial,
      properties: objectToArray(initial.properties, nextId),
    };
  });
  const [collapsed, setCollapsed] = useState(false);
  const [codeView, setCodeView] = useState(false);
  const [raw, setRaw] = useState(() =>
    JSON.stringify(
      { ...schema, properties: arrayToObject(schema.properties) },
      null,
      2
    )
  );
  const [error, setError] = useState("");
  const [propName, setPropName] = useState("MyProp");

  console.debug("RecursiveSchemaEditor", { schema });

  // Update raw code view whenever schema changes
  useEffect(() => {
    setRaw(
      JSON.stringify(
        { ...schema, properties: arrayToObject(schema.properties) },
        null,
        2
      )
    );
    // propagate up
    if (onChange)
      onChange({ ...schema, properties: arrayToObject(schema.properties) });
    // eslint-disable-next-line
  }, [schema]);

  function handleRawChange(txt) {
    setRaw(txt);
    try {
      const obj = JSON.parse(txt);
      setSchema({
        ...obj,
        properties: objectToArray(obj.properties, nextId),
      });
      setError("");
    } catch {
      setError("Invalid JSON");
    }
  }

  const handleAddProperty = () => {
    const newProps = addBlankProperty(schema.properties, nextId, propName);
    setSchema({ ...schema, properties: newProps });
    setPropName("");
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
              {Array.isArray(schema.properties) &&
                schema.properties.map((prop) => (
                  <PropertyEditor
                    key={prop.id}
                    propertyKey={prop.key}
                    onKeyChange={(newKey = "") => {
                      setSchema((s) => ({
                        ...s,
                        properties: s.properties.map((p) =>
                          p.id === prop.id ? { ...p, key: newKey } : p
                        ),
                      }));
                    }}
                    schema={prop.schema}
                    onChange={(newSub) => {
                      setSchema((s) => ({
                        ...s,
                        properties: s.properties.map((p) =>
                          p.id === prop.id ? { ...p, schema: newSub } : p
                        ),
                      }));
                    }}
                    onDelete={() => {
                      setSchema((s) => ({
                        ...s,
                        properties: s.properties.filter(
                          (p) => p.id !== prop.id
                        ),
                      }));
                    }}
                    parentType="object"
                    nextId={nextId}
                    addBlankProperty={addBlankProperty}
                    required={schema.required}
                  />
                ))}
            </div>
            <input
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
            />
            <button onClick={handleAddProperty}>Add Property</button>
          </>
        ))}
    </div>
  );
}
