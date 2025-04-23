import React, { useState } from "react";

// Optional: Use a textarea as a basic code editor, or replace with Monaco/CodeMirror as needed
function CodeEditor({ value, onChange }) {
  return (
    <textarea
      style={{ width: "100%", height: 300, fontFamily: "monospace" }}
      value={value}
      onChange={e => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}

// Main component
export function SchemaEditor({
  schema = {},
  metaSchema = { required: [] },
  onSchemaChange,
}) {
  const [view, setView] = useState("form"); // "form" | "code"
  const [editSchema, setEditSchema] = useState(schema);
  const [code, setCode] = useState(JSON.stringify(schema, null, 2));
  const [error, setError] = useState("");

  // Keep views in sync
  const syncSchemaToCode = (sch) => setCode(JSON.stringify(sch, null, 2));
  const syncCodeToSchema = (txt) => {
    try {
      const parsed = JSON.parse(txt);
      setEditSchema(parsed);
      setError("");
      if (onSchemaChange) onSchemaChange(parsed);
    } catch (e) {
      setError("Invalid JSON");
    }
  };

  // Handlers for form view
  const handleKeywordChange = (key, value) => {
    const newSchema = { ...editSchema, [key]: value };
    setEditSchema(newSchema);
    syncSchemaToCode(newSchema);
    if (onSchemaChange) onSchemaChange(newSchema);
  };

  const handleRemoveKeyword = (key) => {
    if (metaSchema.required.includes(key)) return;
    const newSchema = { ...editSchema };
    delete newSchema[key];
    setEditSchema(newSchema);
    syncSchemaToCode(newSchema);
    if (onSchemaChange) onSchemaChange(newSchema);
  };

  const handleAddKeyword = () => {
    const key = prompt("Enter keyword name:");
    if (!key) return;
    if (editSchema[key] !== undefined) {
      alert("Key already exists");
      return;
    }
    const value = prompt("Enter value (will be interpreted as JSON):", "\"\"");
    try {
      const parsed = JSON.parse(value);
      const newSchema = { ...editSchema, [key]: parsed };
      setEditSchema(newSchema);
      syncSchemaToCode(newSchema);
      if (onSchemaChange) onSchemaChange(newSchema);
    } catch {
      alert("Invalid JSON for value");
    }
  };

  // View toggle
  const handleViewToggle = () => setView(v => v === "form" ? "code" : "form");

  // Code editor changes
  const handleCodeChange = (txt) => {
    setCode(txt);
    syncCodeToSchema(txt);
  };

  // Render
  return (
    <div style={{ border: "1px solid #aaa", borderRadius: 8, padding: 16, maxWidth: 600 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>JSON Schema Editor</strong>
        <button onClick={handleViewToggle}>
          Switch to {view === "form" ? "Code Editor" : "Form View"}
        </button>
      </div>
      {view === "form" ? (
        <>
          <table style={{ width: "100%", marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Keyword</th>
                <th style={{ textAlign: "left" }}>Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(editSchema).map(([k, v]) => (
                <tr key={k}>
                  <td>
                    {k}
                    {metaSchema.required.includes(k) && (
                      <span style={{ color: "red", marginLeft: 4 }} title="Required">*</span>
                    )}
                  </td>
                  <td>
                    <input
                      style={{ width: "100%" }}
                      value={typeof v === "string" ? v : JSON.stringify(v)}
                      onChange={e => {
                        try {
                          handleKeywordChange(k, JSON.parse(e.target.value));
                        } catch {
                          handleKeywordChange(k, e.target.value);
                        }
                      }}
                      disabled={metaSchema.required.includes(k)}
                    />
                  </td>
                  <td>
                    {!metaSchema.required.includes(k) && (
                      <button onClick={() => handleRemoveKeyword(k)}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleAddKeyword}>Add Keyword</button>
        </>
      ) : (
        <>
          <CodeEditor value={code} onChange={handleCodeChange} />
          {error && <div style={{ color: "red" }}>{error}</div>}
        </>
      )}
    </div>
  );
}
