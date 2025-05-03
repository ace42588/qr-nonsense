import React, { useState } from "react";
import BitFieldEditor from "./BitFieldEditor";
import BitFieldPreviewer from "./BitFieldPreviewer";
import BitFieldVisualizer from "./BitFieldVisualizer";
import { generateBitLayout } from "./utils";

export default function BitFieldSection({ title, fields, setFields, sampleValues }) {
  const [expanded, setExpanded] = useState(true);

  const { layout, totalBits } = generateBitLayout(fields);

  function toggleExpanded() {
    setExpanded(prev => !prev);
  }

  return (
    <div style={{
      border: "1px solid #aaa",
      borderRadius: 8,
      padding: 16,
      maxWidth: 900,
    }}>
      <h2
        style={{ display: "flex", alignItems: "center", cursor: "pointer", margin: 0 }}
        onClick={toggleExpanded}
      >
        <span style={{ marginRight: 8 }}>
          {expanded ? "▾" : "▸"}
        </span>
        {title}
      </h2>

      <BitFieldVisualizer layout={layout} totalBits={totalBits} />

      {expanded && (
        <>
          <BitFieldEditor
            fields={fields}
            setFields={setFields}
          />
          <BitFieldPreviewer
            fields={fields}
            sampleValues={sampleValues}
            layout={layout}
            totalBits={totalBits}
          />
        </>
      )}
    </div>
  );
}
