// schemaUtils.js
export function addBlankProperty(propertiesArr, nextId, displayName) {
  let newKey = displayName || "newField";
  let counter = 1;
  const arr = Array.isArray(propertiesArr) ? propertiesArr : [];
  while (arr.some(prop => prop.key === newKey)) newKey = `newField${counter++}`;
  return [
    ...arr,
    { id: nextId(), key: newKey, schema: { type: "string" }, displayName }
  ];
}

export function addBlankItem (items) {
  if (Array.isArray(items)) return [...items, { type: "string" }];
  if (items && Object.keys(items).length) return [items, { type: "string" }];
  return { type: "string" };
};

export function clean(obj) {
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

// Convert properties {foo: {...}, bar: {...}} <-> [{id, key, schema}]
export function objectToArray(obj, nextId) {
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
export function arrayToObject(arr) {
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
