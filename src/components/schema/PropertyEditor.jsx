import { useState } from "react";
import { TypeSelector } from "./TypeSelector";

// Helper: Remove keys with undefined/null/empty string values (for clean JSON output)
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v === "") &&
      !(Array.isArray(v) && v.length === 0)
    ) {
      out[k] = v;
    }
  }
  return out;
}

export function PropertyEditor({
  propertyKey,
  onKeyChange,
  schema,
  onChange,
  onDelete,
  parentType,
  nextId,
  addBlankProperty,
}) {
  const [enumEditValue, setEnumEditValue] = useState("");

  // Normalize type to array for checks
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
    ? [schema.type]
    : [];

  // Enum controls
  const handleEnumAdd = () => {
    if (!enumEditValue) return;
    const values = (schema.enum || []).concat(enumEditValue);
    setEnumEditValue("");
    onChange({ ...schema, enum: values });
  };
  const handleEnumRemove = (idx) => {
    const arr = [...schema.enum];
    arr.splice(idx, 1);
    onChange({ ...schema, enum: arr.length ? arr : undefined });
  };
  const handleEnumEdit = (idx, value) => {
    const arr = [...schema.enum];
    arr[idx] = value;
    onChange({ ...schema, enum: arr });
  };

  // Type-specific constraints, cleaned up
  const handleConstraint = (field, value, parser = (v) => v) => {
    if (value === "" || value === undefined || value === null) {
      // Remove from schema
      const copy = { ...schema };
      delete copy[field];
      onChange(copy);
    } else {
      onChange({ ...schema, [field]: parser(value) });
    }
  };
  /*
  // Add blank nested property for object type
  const addBlankProperty = () => {
    let newKey = "newField";
    let counter = 1;
    const arr = Array.isArray(schema.properties) ? schema.properties : [];
    while (arr.some((prop) => prop.key === newKey))
      newKey = `newField${counter++}`;
    const newProps = [
      ...arr,
      { id: nextId(), key: newKey, schema: { type: "string" } },
    ];
    onChange({ ...schema, properties: newProps });
  };
  */
  const handleAddProperty = () => {
    const newProps = addBlankProperty(schema.properties);
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

  // UI for nested properties or items
  const isObjectType = types.includes("object");
  const isArrayType = types.includes("array");
  const hasPropertykey = !!propertyKey;

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
        marginLeft: parentType === "object" ? 16 : 0,
        background: "#fafaff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {hasPropertykey && (
          <input
            value={propertyKey}
            onChange={(e) => onKeyChange(e.target.value)}
            style={{
              fontWeight: "bold",
              fontSize: 14,
              width: 120,
            }}
            placeholder="Field name"
          />
        )}
        <TypeSelector
          value={schema.type}
          onChange={(type) => onChange({ ...schema, type })}
        />
        <button onClick={onDelete} style={{ color: "red", marginLeft: "auto" }}>
          ✖
        </button>
      </div>

      {types.includes("string") && (
        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
          <label>
            minLength:
            <input
              type="number"
              min={0}
              value={schema.minLength ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "minLength",
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            maxLength:
            <input
              type="number"
              min={0}
              value={schema.maxLength ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "maxLength",
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            pattern:
            <input
              type="text"
              value={schema.pattern ?? ""}
              onChange={(e) =>
                handleConstraint("pattern", e.target.value || undefined)
              }
              style={{ width: 90, marginLeft: 4 }}
            />
          </label>
        </div>
      )}

      {(types.includes("number") || types.includes("integer")) && (
        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
          <label>
            min:
            <input
              type="number"
              value={schema.minimum ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "minimum",
                  e.target.value === "" ? undefined : parseFloat(e.target.value)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            max:
            <input
              type="number"
              value={schema.maximum ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "maximum",
                  e.target.value === "" ? undefined : parseFloat(e.target.value)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            multipleOf:
            <input
              type="number"
              step="any"
              value={schema.multipleOf ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "multipleOf",
                  e.target.value === "" ? undefined : parseFloat(e.target.value)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
        </div>
      )}

      {/* Enum controls */}
      <div style={{ marginTop: 4 }}>
        {schema.enum ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              <strong>Enum:</strong>
              <button
                onClick={() => onChange({ ...schema, enum: undefined })}
                style={{ marginLeft: 6 }}
              >
                Remove Enum
              </button>
            </div>
            <div>
              {schema.enum.map((val, idx) => (
                <span key={idx} style={{ marginRight: 8 }}>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleEnumEdit(idx, e.target.value)}
                    style={{ width: 100 }}
                  />
                  <button onClick={() => handleEnumRemove(idx)}>✖</button>
                </span>
              ))}
            </div>
            <div>
              <input
                type="text"
                value={enumEditValue}
                onChange={(e) => setEnumEditValue(e.target.value)}
                style={{ width: 100, marginRight: 4 }}
                placeholder="New value"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEnumAdd();
                }}
              />
              <button onClick={handleEnumAdd} disabled={!enumEditValue}>
                Add Value
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ fontSize: 12 }}
            onClick={() => onChange({ ...schema, enum: [""] })}
          >
            Add Enum
          </button>
        )}
      </div>

      {/* Recursively render for nested objects */}
      {isObjectType && (
        <div style={{ marginLeft: 12, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={handleAddProperty} style={{ fontSize: 12 }}>
              Add Property
            </button>
          </div>
          {(schema.properties || []).map((prop) => (
            <PropertyEditor
              key={prop.id}
              propertyKey={prop.key}
              onKeyChange={(newKey) => {
                const arr = schema.properties.map((p) =>
                  p.id === prop.id ? { ...p, key: newKey } : p
                );
                onChange({ ...schema, properties: arr });
              }}
              schema={prop.schema}
              onChange={(newSub) => {
                const arr = schema.properties.map((p) =>
                  p.id === prop.id ? { ...p, schema: newSub } : p
                );
                onChange({ ...schema, properties: arr });
              }}
              onDelete={() => {
                const arr = schema.properties.filter((p) => p.id !== prop.id);
                onChange({ ...schema, properties: arr });
              }}
              parentType="object"
              nextId={nextId}
            />
          ))}
        </div>
      )}

      {isArrayType && (
        <div style={{ marginLeft: 12, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={addBlankItem} style={{ fontSize: 12 }}>
              Add Item Schema
            </button>
          </div>
          {Array.isArray(schema.items) ? (
            schema.items.map((item, idx) => (
              <PropertyEditor
                key={idx}
                propertyKey={`[${idx}]`}
                onKeyChange={() => {}}
                schema={item}
                onChange={(newItem) => {
                  const arr = [...schema.items];
                  arr[idx] = newItem;
                  onChange({ ...schema, items: arr });
                }}
                onDelete={() => {
                  const arr = [...schema.items];
                  arr.splice(idx, 1);
                  onChange({ ...schema, items: arr });
                }}
                parentType="array"
                nextId={nextId}
              />
            ))
          ) : schema.items && Object.keys(schema.items).length > 0 ? (
            <PropertyEditor
              onKeyChange={() => {}}
              schema={schema.items}
              onChange={(newItem) => onChange({ ...schema, items: newItem })}
              onDelete={() => onChange({ ...schema, items: {} })}
              parentType="array"
              nextId={nextId}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
