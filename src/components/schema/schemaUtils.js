// schemaUtils.js
export function addBlankProperty(propertiesArr, nextId) {
  let newKey = "newField";
  let counter = 1;
  const arr = Array.isArray(propertiesArr) ? propertiesArr : [];
  while (arr.some(prop => prop.key === newKey)) newKey = `newField${counter++}`;
  return [
    ...arr,
    { id: nextId(), key: newKey, schema: { type: "string" } }
  ];
}

export function addBlankItem (items) {
  if (Array.isArray(items)) return [...items, { type: "string" }];
  if (items && Object.keys(items).length) return [items, { type: "string" }];
  return { type: "string" };
};
