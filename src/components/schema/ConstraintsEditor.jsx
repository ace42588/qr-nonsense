import React, { useState } from "react";
import { clean } from "./schemaUtils";

export function ConstraintsEditor({ schema, onChange }) {
  const [enumEditValue, setEnumEditValue] = useState("");
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
    ? [schema.type]
    : [];

  // Enum controls
  const handleEnumAdd = () => {
    if (!enumEditValue) return;
    const values = (schema.enum || []).concat(enumEditValue);
    setEnumEditValue("");
    onChange({ ...schema, enum: values });
  };
  const handleEnumRemove = (idx) => {
    const arr = [...schema.enum];
    arr.splice(idx, 1);
    onChange({ ...schema, enum: arr.length ? arr : undefined });
  };
  const handleEnumEdit = (idx, value) => {
    const arr = [...schema.enum];
    arr[idx] = value;
    onChange({ ...schema, enum: arr });
  };

  // Constraint fields
  const handleConstraint = (field, value, parser = (v) => v) => {
    if (value === "" || value === undefined || value === null) {
      const copy = { ...schema };
      delete copy[field];
      onChange(copy);
    } else {
      onChange({ ...schema, [field]: parser(value) });
    }
  };

  return (
    <div style={{ margin: "6px 0" }}>
      {types.includes("string") && (
        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
          <label>
            minLength:
            <input
              type="number"
              min={0}
              value={schema.minLength ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "minLength",
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            maxLength:
            <input
              type="number"
              min={0}
              value={schema.maxLength ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "maxLength",
                  e.target.value === ""
                    ? undefined
                    : parseInt(e.target.value, 10)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            pattern:
            <input
              type="text"
              value={schema.pattern ?? ""}
              onChange={(e) =>
                handleConstraint("pattern", e.target.value || undefined)
              }
              style={{ width: 90, marginLeft: 4 }}
            />
          </label>
        </div>
      )}
      {(types.includes("number") || types.includes("integer")) && (
        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
          <label>
            min:
            <input
              type="number"
              value={schema.minimum ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "minimum",
                  e.target.value === "" ? undefined : parseFloat(e.target.value)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            max:
            <input
              type="number"
              value={schema.maximum ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "maximum",
                  e.target.value === "" ? undefined : parseFloat(e.target.value)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
          <label>
            multipleOf:
            <input
              type="number"
              step="any"
              value={schema.multipleOf ?? ""}
              onChange={(e) =>
                handleConstraint(
                  "multipleOf",
                  e.target.value === "" ? undefined : parseFloat(e.target.value)
                )
              }
              style={{ width: 60, marginLeft: 4 }}
            />
          </label>
        </div>
      )}

      {/* Enum controls */}
      <div style={{ marginTop: 4 }}>
        {schema.enum ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              <strong>Enum:</strong>
              <button
                onClick={() => onChange({ ...schema, enum: undefined })}
                style={{ marginLeft: 6 }}
              >
                Remove Enum
              </button>
            </div>
            <div>
              {schema.enum.map((val, idx) => (
                <span key={idx} style={{ marginRight: 8 }}>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleEnumEdit(idx, e.target.value)}
                    style={{ width: 100 }}
                  />
                  <button onClick={() => handleEnumRemove(idx)}>✖</button>
                </span>
              ))}
            </div>
            <div>
              <input
                type="text"
                value={enumEditValue}
                onChange={(e) => setEnumEditValue(e.target.value)}
                style={{ width: 100, marginRight: 4 }}
                placeholder="New value"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEnumAdd();
                }}
              />
              <button onClick={handleEnumAdd} disabled={!enumEditValue}>
                Add Value
              </button>
            </div>
          </div>
        ) : (
          <button
            style={{ fontSize: 12 }}
            onClick={() => onChange({ ...schema, enum: [""] })}
          >
            Add Enum
          </button>
        )}
      </div>
    </div>
  );
}
