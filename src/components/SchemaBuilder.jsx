import React, { useState } from "react";

export default function SchemaBuilder() {
  const [schema, setSchema] = useState([]);

  const addField = (parentPath = []) => {
    console.debug("addField");
    const field = {
      label: "",
      name: "",
      type: "string",
      value: "",
      children: [],
    };
    updateSchema((s) => insertAtPath(s, parentPath, field));
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
        />
      ))}
      <button onClick={() => addField()} className="mt-4 text-blue-600">
        + Add Top-Level Field
      </button>

      <pre className="mt-4 bg-gray-100 p-2 whitespace-pre-wrap text-sm">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}

function FieldEditor({ field, path, onChange, onAddChild }) {
  return (
    <div className="border p-2 mb-2 rounded">
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
  const lastKey = path.pop();
  let obj = schema;
  for (const key of path) obj = obj[key];
  if (!obj[lastKey]) obj[lastKey] = [];
  obj[lastKey].push(field);
  return schema;
}

function updateAtPath(schema, path, updater) {
  const last = path[path.length - 1];
  const obj = path.slice(0, -1).reduce((acc, k) => acc[k], schema);
  obj[last] = updater(obj[last]);
  return schema;
}
