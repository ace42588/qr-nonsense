export function insertAtPath(schema, path, field) {
  const clone = structuredClone(schema);
  if (path.length === 0) {
    clone.push(field);
    return clone;
  }
  const lastKey = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => acc[key], clone);
  if (!Array.isArray(parent[lastKey])) parent[lastKey] = [];
  parent[lastKey].push(field);
  return clone;
}

export function updateAtPath(schema, path, updater) {
  const clone = structuredClone(schema);
  const last = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => acc[key], clone);
  parent[last] = updater(parent[last]);
  return clone;
}

export function removeAtPath(schema, path) {
  const clone = structuredClone(schema);
  if (path.length === 1) {
    clone.splice(path[0], 1);
    return clone;
  }
  const index = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => acc[key], clone);
  if (Array.isArray(parent)) {
    parent.splice(index, 1);
  }
  return clone;
}

export function schemaToObject(schema) {
  const result = {};
  for (const field of schema) {
    const { name, type, value, children } = field;
    if (!name) continue;

    if (type === "string") {
      result[name] = value;
    } else if (type === "number") {
      result[name] = parseFloat(value);
    } else if (type === "object") {
      result[name] = schemaToObject(children || []);
    } else if (type === "array") {
      // Check if children are objects
      if ((children || []).every(c => c.type === "object")) {
        result[name] = children.map(item => schemaToObject(item.children || []));
      } else {
        // fallback: single object describing structure
        result[name] = [schemaToObject(children || [])];
      }
    }
  }
  return result;
}
