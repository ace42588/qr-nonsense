// SchemaEditor.js
import React from "react";
import FieldEditor from "./FieldEditor";
import { insertAtPath, updateAtPath, removeAtPath } from "../utils/schemaUtils";

export default function SchemaEditor({ schema, setSchema }) {
  const updateSchema = (fn) => {
    setSchema((prev) => structuredClone(fn(prev)));
  };

  const addField = (path = []) => {
    const field = {
      label: "",
      name: "",
      type: "string",
      value: "",
      children: []
    };
    updateSchema((s) => insertAtPath(s, path, field));
  };

  const updateField = (path, key, val) => {
    updateSchema((s) => updateAtPath(s, path, (f) => ({ ...f, [key]: val })));
  };

  const removeField = (path) => {
    updateSchema((s) => removeAtPath(s, path));
  };

  return (
    <div>
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
      <button onClick={() => addField()} className="mt-2 text-blue-600">
        + Add Top-Level Field
      </button>
    </div>
  );
}
