// Collapsible, Nested JSON Schema Editor with Editable Keys and Multi-type Dropdowns
import React, { useEffect, useRef, useState } from "react";
import { PropertyEditor } from "./PropertyEditor";

function useIdCounter() {
  const counter = useRef(0);
  const nextId = () => {
    counter.current += 1;
    return "id" + counter.current;
  };
  return nextId;
}

// Convert properties {foo: {...}, bar: {...}} <-> [{id, key, schema}]
function objectToArray(obj, nextId) {
  return Object.entries(obj || {}).map(([key, schema]) => ({
    id: nextId(),
    key,
    schema:
      schema.type === "object"
        ? {
            ...schema,
            properties: objectToArray(schema.properties, nextId),
          }
        : schema.type === "array" &&
          schema.items &&
          schema.items.type === "object"
        ? {
            ...schema,
            items: {
              ...schema.items,
              properties: objectToArray(schema.items.properties, nextId),
            },
          }
        : schema,
  }));
}
function arrayToObject(arr) {
  const obj = {};
  arr.forEach(({ key, schema }) => {
    obj[key] = {
      ...schema,
      ...(schema.type === "object" && Array.isArray(schema.properties)
        ? { properties: arrayToObject(schema.properties) }
        : {}),
      ...(schema.type === "array" &&
      schema.items &&
      schema.items.type === "object" &&
      Array.isArray(schema.items.properties)
        ? {
            items: {
              ...schema.items,
              properties: arrayToObject(schema.items.properties),
            },
          }
        : {}),
    };
  });
  return obj;
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
  const [label, setLabel] = useState("MyProp");

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
    const excludedKeys = ["id", "displayName"];
    setRaw(txt);
    try {
      const obj = JSON.parse(txt, ({ key, value }) =>
        excludedKeys.some((e) => e === key) ? undefined : value
      );
      setSchema({
        ...obj,
        properties: objectToArray(obj.properties, nextId),
      });
      setError("");
    } catch {
      setError("Invalid JSON");
    }
  }

  // Add top-level blank property
  const addBlankProperty = () => {
    //let newKey = "newField";
    const newKey = label;
    let counter = 1;
    const arr = Array.isArray(schema.properties) ? schema.properties : [];
    while (arr.some((prop) => prop.key === newKey))
      newKey = `newField${counter++}`;
    setSchema({
      ...schema,
      properties: [
        ...arr,
        {
          displayName: label,
          id: nextId(),
          key: newKey,
          schema: { type: "string" },
        },
      ],
    });
    setLabel("");
  };
  
    // Add blank nested property for object type
  const addBlankProperty = (propertiesArr) => {
    let newKey = "newField";
    let counter = 1;
    const arr = Array.isArray(propertiesArr) ? propertiesArr : [];
    while (arr.some((prop) => prop.key === newKey))
      newKey = `newField${counter++}`;
    const newProps = [
      ...arr,
      { id: nextId(), key: newKey, schema: { type: "string" } },
    ];
    onChange({ ...schema, properties: newProps });
  };

  // Add blank item for array type
  const addBlankItem = () => {
    let items = schema.items;
    if (Array.isArray(items)) items = [...items, { type: "string" }];
    else if (items && Object.keys(items).length)
      items = [items, { type: "string" }];
    else items = { type: "string" };
    onChange({ ...schema, items });
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
                    onKeyChange={(newKey) => {
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
                  />
                ))}
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{
                fontWeight: "bold",
                fontSize: 14,
                width: 120,
              }}
            />
            <button onClick={addBlankProperty}>Add Property</button>
          </>
        ))}
    </div>
  );
}
