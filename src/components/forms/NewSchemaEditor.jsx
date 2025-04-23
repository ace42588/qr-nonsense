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
  // value: string or array of strings
  const [custom, setCustom] = useState(
    Array.isArray(value) ? value : value ? [value] : []
  );

  function handleChange(e) {
    const { options } = e.target;
    const types = [];
    for (let i = 0; i < options.length; ++i) {
      if (options[i].selected) types.push(options[i].value);
    }
    setCustom(types);
    onChange(types.length === 1 ? types[0] : types);
  }

  return (
    <select
      multiple
      value={custom}
      onChange={handleChange}
      style={{ minWidth: 100 }}
      size={JSON_SCHEMA_PRIMITIVES.length}
    >
      {JSON_SCHEMA_PRIMITIVES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

function PropertyEditor({
  schema,
  onChange,
  path = [],
  allowDelete = false,
  onDelete,
}) {
  // schema: the property schema being edited
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleTypeChange(newType) {
    const updated = { ...schema, type: newType };
    onChange(updated);
  }

  function handleKeywordChange(key, value) {
    const updated = { ...schema, [key]: value };
    onChange(updated);
  }

  function handleRemoveKeyword(key) {
    const updated = { ...schema };
    delete updated[key];
    onChange(updated);
  }

  function addProperty() {
    const name = prompt("Property name?");
    if (!name) return;
    const props = { ...schema.properties, [name]: { type: "string" } };
    onChange({ ...schema, properties: props });
  }

  function addItem() {
    // For arrays: items may be a schema or an array of schemas
    let items = schema.items || {};
    if (Array.isArray(items)) {
      items = [...items, { type: "string" }];
    } else if (Object.keys(items).length === 0) {
      items = { type: "string" };
    } else {
      items = [items, { type: "string" }];
    }
    onChange({ ...schema, items });
  }

  const effectiveType =
    schema.type || (schema.default !== undefined ? inferType(schema.default) : undefined);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        margin: 8,
        padding: 8,
        borderRadius: 6,
        background: "#fafaff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>{path.length ? path[path.length - 1] : "Root"}</strong>
        <span style={{ fontSize: 12, color: "#888" }}>
          {Array.isArray(effectiveType) ? effectiveType.join(",") : effectiveType}
        </span>
        <TypeSelector value={schema.type} onChange={handleTypeChange} />
        {allowDelete && (
          <button
            style={{ marginLeft: "auto", color: "red" }}
            onClick={onDelete}
            title="Remove this property"
          >
            Remove
          </button>
        )}
      </div>
      <div style={{ marginLeft: 20 }}>
        {Array.isArray(schema.type)
          ? schema.type.includes("object")
          : schema.type === "object" ? (
          <div>
            <strong>Properties</strong>
            <button style={{ marginLeft: 8 }} onClick={addProperty}>
              Add Property
            </button>
            <div style={{ marginLeft: 8 }}>
              {schema.properties &&
                Object.entries(schema.properties).map(([k, v]) => (
                  <PropertyEditor
                    key={k}
                    path={[...path, k]}
                    schema={v}
                    onChange={(news) => {
                      onChange({
                        ...schema,
                        properties: { ...schema.properties, [k]: news },
                      });
                    }}
                    allowDelete
                    onDelete={() => {
                      const nextProps = { ...schema.properties };
                      delete nextProps[k];
                      onChange({ ...schema, properties: nextProps });
                    }}
                  />
                ))}
            </div>
          </div>
        ) : null}

        {Array.isArray(schema.type)
          ? schema.type.includes("array")
          : schema.type === "array" ? (
          <div>
            <strong>Items</strong>
            <button style={{ marginLeft: 8 }} onClick={addItem}>
              Add Item Schema
            </button>
            <div style={{ marginLeft: 8 }}>
              {Array.isArray(schema.items)
                ? schema.items.map((item, idx) => (
                    <PropertyEditor
                      key={idx}
                      path={[...path, `items[${idx}]`]}
                      schema={item}
                      onChange={(news) => {
                        const arr = [...schema.items];
                        arr[idx] = news;
                        onChange({ ...schema, items: arr });
                      }}
                      allowDelete
                      onDelete={() => {
                        const arr = [...schema.items];
                        arr.splice(idx, 1);
                        onChange({ ...schema, items: arr });
                      }}
                    />
                  ))
                : schema.items && Object.keys(schema.items).length > 0 ? (
                    <PropertyEditor
                      path={[...path, "items"]}
                      schema={schema.items}
                      onChange={(news) =>
                        onChange({ ...schema, items: news })
                      }
                    />
                  ) : null}
            </div>
          </div>
        ) : null}

        {/* Additional simple keywords (title, description, label, default, etc.) */}
        <div style={{ marginTop: 8 }}>
          <label>
            <span style={{ fontSize: 12 }}>label: </span>
            <input
              value={schema.label || ""}
              onChange={e => handleKeywordChange("label", e.target.value)}
              style={{ width: 140 }}
            />
            {schema.label && (
              <button
                style={{ marginLeft: 6 }}
                onClick={() => handleRemoveKeyword("label")}
              >
                x
              </button>
            )}
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>
            <span style={{ fontSize: 12 }}>default: </span>
            <input
              value={
                schema.default === undefined
                  ? ""
                  : typeof schema.default === "string"
                  ? schema.default
                  : JSON.stringify(schema.default)
              }
              onChange={e => {
                let val = e.target.value;
                try {
                  val = JSON.parse(val);
                } catch {}
                handleKeywordChange("default", val);
              }}
              style={{ width: 140 }}
            />
            {schema.default !== undefined && (
              <button
                style={{ marginLeft: 6 }}
                onClick={() => handleRemoveKeyword("default")}
              >
                x
              </button>
            )}
          </label>
        </div>
        {/* Expand for any other meta fields here */}
        <div style={{ marginTop: 8 }}>
          <button
            style={{ fontSize: 12 }}
            onClick={() => setShowAdvanced((a) => !a)}
          >
            {showAdvanced ? "Hide" : "Show"} advanced (raw JSON)
          </button>
          {showAdvanced && (
            <pre
              style={{
                background: "#f5f5fa",
                fontSize: 12,
                border: "1px solid #eee",
                padding: 4,
                marginTop: 4,
                overflow: "auto",
                maxWidth: 400,
              }}
            >
              {JSON.stringify(schema, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecursiveSchemaEditor({
  value,
  onChange,
  title = "JSON Schema Editor",
}) {
  const [schema, setSchema] = useState(value || { type: "object", properties: {} });

  function handleSchemaChange(newSchema) {
    setSchema(newSchema);
    if (onChange) onChange(newSchema);
  }

  // Code editor (raw) view toggle
  const [showCode, setShowCode] = useState(false);
  const [raw, setRaw] = useState(JSON.stringify(schema, null, 2));
  const [error, setError] = useState("");

  function handleRawChange(txt) {
    setRaw(txt);
    try {
      const obj = JSON.parse(txt);
      setSchema(obj);
      setError("");
      if (onChange) onChange(obj);
    } catch (e) {
      setError("Invalid JSON");
    }
  }

  // keep raw in sync if schema changes from outside
  React.useEffect(() => {
    setRaw(JSON.stringify(schema, null, 2));
  }, [schema]);

  return (
    <div style={{ maxWidth: 700, border: "1px solid #aaa", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{title}</strong>
        <button onClick={() => setShowCode((b) => !b)}>
          {showCode ? "Form View" : "Code Editor"}
        </button>
      </div>
      {showCode ? (
        <>
          <textarea
            value={raw}
            onChange={e => handleRawChange(e.target.value)}
            style={{ width: "100%", height: 350, fontFamily: "monospace" }}
            spellCheck={false}
          />
          {error && <div style={{ color: "red" }}>{error}</div>}
        </>
      ) : (
        <PropertyEditor
          schema={schema}
          onChange={handleSchemaChange}
          path={[]}
          allowDelete={false}
        />
      )}
    </div>
  );
}
