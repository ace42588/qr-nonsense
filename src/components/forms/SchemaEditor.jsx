// SchemaEditor.js
import React from "react";
import { useSchema, useSchemaContext } from "../../state";
import { FieldEditor } from "./FieldEditor";
import {
  insertAtPath,
  updateAtPath,
  removeAtPath,
} from "../../utils/schemaUtils";

export function SchemaEditor() {
  const { fields } = useSchemaContext();
  const { setFields, updateField } = useSchema();
  console.debug("useSchemaContext()", useSchemaContext());
  console.debug("useSchema()", useSchema());

  const addField = () => {
    setFields([...fields, { label: "", name: "", type: "string", value: "" }]);
  };

  const handleChange = (path, key, val) => {
    updateField(path[0], { [key]: val });
  };

  const removeField = (path) => {
    const updated = fields.slice();
    updated.splice(path[0], 1);
    setFields(updated);
  };

  return (
    <div>
      {fields.map((field, i) => (
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
