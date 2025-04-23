import { TypeSelector } from "./TypeSelector";

export function PropertyEditor({
  propertyKey,
  onKeyChange,
  schema,
  onChange,
  onDelete,
  parentType,
  nextId,
}) {

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
  const isObjectType = Array.isArray(schema.type)
    ? schema.type.includes("object")
    : schema.type === "object";
  const isArrayType = Array.isArray(schema.type)
    ? schema.type.includes("array")
    : schema.type === "array";

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
