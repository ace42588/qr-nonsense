import React, { useMemo, useState } from "react";

export default function BitFieldValues({ values, setValues, layout }) {
  const [expanded, setExpanded] = useState(false);

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  return (
    <>
      <p onClick={toggleExpanded}>
        <span style={{ marginRight: 8 }}>{expanded ? "▾" : "▸"}</span>Values
      </p>
      {expanded && (
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
              <label style={{ marginRight: 8, minWidth: 100 }}>
                {field.label}
              </label>
              <span style={{ marginLeft: 8, color: "#888" }}>
                ({field.width} bits, {field.startBit}→{field.endBit})
              </span>
              <input
                type="number"
                value={values[field.label] ?? ""}
                onChange={(e) => {
                  const next = {
                    ...values,
                    [field.label]:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  };
                  setValues(next);
                }}
                style={{ maxWidth: 100 }}
              />
            </div>
          ))}
        </>
      )}
    </>
  );
}
