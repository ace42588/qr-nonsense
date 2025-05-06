import React, { useMemo, useState } from "react";

const encoder = new TextEncoder("utf-8");

const types = [
  { value: "base10", label: "Dec" },
  { value: "base16", label: "Hex" },
  { value: "string", label: "String" },
];

export function BitFieldValues({ values, setValues, layout }) {
  const [type, setType] = useState("base10");

  const handleInputChange = (e, field) => {
    let newValue = e.target.value;
    switch (type) {
      case "base10": {
        newValue = Number(newValue);
        break;
      }
      case "base16": {
        newValue = parseInt(newValue, 16);
        break;
      }
      case "string": {
        newValue = encoder.encode(newValue);
        break;
      }
      default: {
        newValue = undefined;
      }
    }
    const newValues = {
      ...values,
      [field.label]: newValue,
    };
    console.debug("BitFieldValues: handleInputChange", { newValues });
    setValues({
      ...values,
      [field.label]: newValue,
    });
  };

  return (
    <>
      {layout.map((field) => (
        <div
          key={field.label}
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            justifyContent: "space-between",
          }}
        >
          <label style={{ marginRight: 8, minWidth: 100 }}>{field.label}</label>
          <select
            id="fieldType"
            value={field.type}
            onChange={(e) => setType(e.target.value)}
          >
            {types.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={values[field.label] ?? ""}
            onChange={(e) => handleInputChange(e, field)}
            style={{ maxWidth: 100 }}
          />
        </div>
      ))}
    </>
  );
}
