// schemaUtils.js
export function addBlankProperty(propertiesArr, nextId, displayName) {
  let newKey = "newField";
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