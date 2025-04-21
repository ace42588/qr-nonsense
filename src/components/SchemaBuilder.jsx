import React, { useState } from "react";

export default function SchemaBuilder() {
  const [schema, setSchema] = useState([]);

  const addField = (parentPath = []) => {
    const field = {
      label: "",
      name: "",
      type: "string",
      value: "",
      children: [],
    };
    updateSchema((s) => insertAtPath(s, parentPath, field));
  };

  const removeField = (path) => {
    updateSchema((s) => removeAtPath(s, path));
  };

  const updateField = (path, key, val) => {
    updateSchema((s) => updateAtPath(s, path, (f) => ({ ...f, [key]: val })));
  };

  const updateSchema = (fn) => {
    setSchema((prev) => structuredClone(fn(prev)));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Custom Schema Builder</h2>
      {schema.map((field, i) => (
        <FieldEditor
          key={i}
          field={field}
          path={[i]}
          onChange={updateField}
          onAddChild={addField}
          onRemove={removeField}
        />
      ))}
      <button onClick={() => addField()} className="mt-4 text-blue-600">
        + Add Top-Level Field
      </button>

      <pre className="mt-4 bg-gray-100 p-2 whitespace-pre-wrap text-sm">
        {JSON.stringify(schemaToObject(schema), null, 2)}
      </pre>
    </div>
  );
}

function FieldEditor({ field, path, onChange, onAddChild, onRemove }) {
  return (
    <div className="border p-2 mb-2 rounded">
      <button
        className="absolute top-1 right-1 text-red-500 text-sm"
        onClick={() => onRemove(path)}
      >
        ✖
      </button>
      <div className="flex gap-2 mb-2">
        <input
          className="border p-1"
          placeholder="Label"
          value={field.label}
          onChange={(e) => onChange(path, "label", e.target.value)}
        />
        <input
          className="border p-1"
          placeholder="Field name"
          value={field.name}
          onChange={(e) => onChange(path, "name", e.target.value)}
        />
        <select
          className="border p-1"
          value={field.type}
          onChange={(e) => onChange(path, "type", e.target.value)}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="object">Object</option>
          <option value="array">Array</option>
        </select>
      </div>

      {["string", "number"].includes(field.type) && (
        <input
          className="border p-1 w-full"
          placeholder="Value"
          value={field.value}
          onChange={(e) => onChange(path, "value", e.target.value)}
        />
      )}

      {["object", "array"].includes(field.type) && (
        <>
          <div className="ml-4 mt-2">
            {(field.children || []).map((child, i) => (
              <FieldEditor
                key={i}
                field={child}
                path={[...path, "children", i]}
                onChange={onChange}
                onAddChild={onAddChild}
                onRemove={onRemove}
              />
            ))}
            <button
              className="text-sm text-blue-600 mt-1"
              onClick={() => onAddChild([...path, "children"])}
            >
              + Add Child Field
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Utility functions
function insertAtPath(schema, path, field) {
  const newSchema = structuredClone(schema);

  if (path.length === 0) return [...newSchema, field];

  const lastKey = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => acc[key], newSchema);

  if (!Array.isArray(parent[lastKey])) {
    parent[lastKey] = [];
  }

  parent[lastKey].push(field);

  return newSchema;
}

function updateAtPath(schema, path, updater) {
  const last = path[path.length - 1];
  const obj = path.slice(0, -1).reduce((acc, k) => acc[k], schema);
  obj[last] = updater(obj[last]);
  return schema;
}

function removeAtPath(schema, path) {
  const clone = structuredClone(schema);

  if (path.length === 1) {
    // Top-level field
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

function schemaToObject(schema) {
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
      // Represent as array of 1 item with the shape defined by children
      result[name] = [schemaToObject(children || [])];
    }
  }

  return result;
}
