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
                  e.target.value === "" ? undefined : parseInt(e.target.value, 10)
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
                onChange({
                  ...schema,
                  minimum:
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </label>
          <label>
            max:
            <input
              type="number"
              value={schema.maximum ?? ""}
              onChange={(e) =>
                onChange({
                  ...schema,
                  maximum:
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </label>
          <label>
            multipleOf:
            <input
              type="number"
              step="any"
              value={schema.multipleOf ?? ""}
              onChange={(e) =>
                onChange({
                  ...schema,
                  multipleOf:
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </label>
        </div>
      )}

      {schema.enum && (
        <div style={{ marginTop: 4 }}>
          <label>
            Enum values (comma-separated):&nbsp;
            <input
              type="text"
              value={schema.enum.join(",")}
              onChange={(e) =>
                onChange({
                  ...schema,
                  enum: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              style={{ width: 180 }}
            />
            <button onClick={() => onChange({ ...schema, enum: undefined })}>
              x
            </button>
          </label>
        </div>
      )}
      <button
        style={{ fontSize: 12, marginLeft: 4 }}
        onClick={() => onChange({ ...schema, enum: [""] })}
        disabled={!!schema.enum}
      >
        Add Enum
      </button>

      {/* Recursively render for nested objects */}
      {isObjectType && (
        <div style={{ marginLeft: 12, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={addBlankProperty} style={{ fontSize: 12 }}>
              Add Property
            </button>
          </div>
          {Array.isArray(schema.properties) &&
            schema.properties.map((prop) => {
              console.debug("Object", { prop });
              return (
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
                    const arr = schema.properties.filter(
                      (p) => p.id !== prop.id
                    );
                    onChange({ ...schema, properties: arr });
                  }}
                  parentType="object"
                  nextId={nextId}
                />
              );
            })}
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
            schema.items.map((item, idx) => {
              console.debug("Array", { item, idx });
              return (
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
              );
            })
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
