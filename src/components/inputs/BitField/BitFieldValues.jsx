import React, { useMemo, useState } from "react";

const encoder = new TextEncoder("utf-8");

const types = [{value:"base10", label: "Dec"},{value:"base16", label: "Hex"},{value:"string", label: "String"}];

export function BitFieldValues({ values, setValues, layout }) {
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
              value={field.type || }
              onChange={(e) => setErrorCorrection(e.target.value)}
            >
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          <input
            type="text"
            value={values[field.label] ?? ""}
            onChange={(e) => {
              const next = {
                ...values,
                [field.label]:
                  e.target.value === "" ? undefined : encoder.encode(e.target.value),
              };
              setValues(next);
            }}
            style={{ maxWidth: 100 }}
          />
        </div>
      ))}
    </>
  );
}
