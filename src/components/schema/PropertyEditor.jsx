import { useState } from "react";
import { TypeSelector } from "./TypeSelector";
import { addBlankItem } from "./schemaUtils";
import { ConstraintsEditor } from "./ConstraintsEditor";

export function PropertyEditor({
  displayName,
  propertyKey,
  onKeyChange,
  schema,
  onChange,
  onDelete,
  parentType,
  nextId,
  addBlankProperty,
  required,
}) {
  console.debug("PropertyEditor", { required, schema });
  const [enumEditValue, setEnumEditValue] = useState("");
  const [propName, setPropName] = useState("newField");

  // Normalize type to array for checks
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
    ? [schema.type]
    : [];

  required = Array.isArray(required) ? required : required ? [required] : [];

  const handleAddProperty = () => {
    const newProps = addBlankProperty(schema.properties, nextId, propName);
    onChange({ ...schema, properties: newProps });
    setPropName("");
  };

  const handleAddItem = () => {
    const newItems = addBlankItem(schema.items);
    console.debug("handleAddItem", { newItems });
    onChange({ ...schema, items: newItems });
  };

  // UI for nested properties or items
  const isObjectType = types.includes("object");
  const isArrayType = types.includes("array");
  const hasPropertykey = !!propertyKey;
  const isRemovable = !required.includes(propertyKey);

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
          <div className="input-container">
            <label className="input-label">Property</label>
            <input
              value={propertyKey}
              onChange={(e) => onKeyChange(e.target.value)}
              style={{
                fontWeight: "bold",
                fontSize: 14,
                width: 120,
              }}
              placeholder="Property"
            />
          </div>
        )}
        <TypeSelector
          value={schema.type}
          onChange={(type) => onChange({ ...schema, type })}
        />
        {isRemovable && (
          <button
            onClick={onDelete}
            style={{ color: "red", marginLeft: "auto" }}
          >
            ✖
          </button>
        )}
      </div>
      <ConstraintsEditor schema={schema} onChange={onChange} />
      {/* Recursively render for nested objects */}
      {console.debug("properties", schema.properties)}
      {isObjectType && (
        <div style={{ marginLeft: 12, marginTop: 4 }}>
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
              addBlankProperty={addBlankProperty}
              required={prop.required}
            />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
              style={{
                fontWeight: "bold",
                fontSize: 14,
                width: 120,
              }}
            />
            <button onClick={handleAddProperty} style={{ fontSize: 12 }}>
              Add Property
            </button>
          </div>
        </div>
      )}
      {console.debug("items", schema.items)}
      {isArrayType && (
        <div style={{ marginLeft: 12, marginTop: 4 }}>
          {Array.isArray(schema.items) ? (
            schema.items.map((item, idx) => (
              <>
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
                  addBlankProperty={addBlankProperty}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={handleAddItem} style={{ fontSize: 12 }}>
                    Add Item Schema
                  </button>
                </div>
              </>
            ))
          ) : schema.items && Object.keys(schema.items).length > 0 ? (
            <PropertyEditor
              onKeyChange={() => {}}
              schema={schema.items}
              onChange={(newItem) => onChange({ ...schema, items: newItem })}
              onDelete={() => onChange({ ...schema, items: {} })}
              parentType="array"
              nextId={nextId}
              addBlankProperty={addBlankProperty}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
