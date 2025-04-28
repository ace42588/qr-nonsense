import React, { useState } from "react";
import BitFieldEditor from "./BitFieldEditor";
import BitFieldPreviewer from "./BitFieldPreviewer";

import { generateBitLayout, generateRandomPacket, bytesToHex } from "./utils"; // utility functions

export default function OrderBitFieldEditor() {
  const [schemas, setSchemas] = useState({
    header: [
      { id: "0", label: "platform", min: 0, max: 3 },
      { id: "1", label: "confId", min: 0, max: 255 },
      { id: "2", label: "transactionId", min: 0, max: 1048575 },
    ],
    item: [
      { id: "0", label: "variant", min: 0, max: 65535 },
      { id: "1", label: "quantity", min: 0, max: 255 },
    ],
  });

  const [sampleValues, setSampleValues] = useState({
    header: {},
    items: [],
  });

  const [expandedSections, setExpandedSections] = useState({
    header: false,
    item: false,
  });

  function updateSchema(name, newFields) {
    console.debug("updateSchema", { name, newFields });
    setSchemas((prev) => ({
      ...prev,
      [name]: newFields,
    }));
  }

  function handleGenerateRandom() {
    const { headerValues, items } = generateRandomPacket({
      headerFields: schemas.header,
      itemFields: schemas.item,
      itemCount: 5, // or let user specify number later
    });
    console.debug("handleGenerateRandom", { headerValues, items });

    setSampleValues({
      header: headerValues,
      items: items,
    });
  }

  function toggleSection(name) {
    setExpandedSections((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }

  return (
    <div className="input-form">
      {/* Header definition */}
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <h3
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={() => toggleSection("header")}
        >
          <span style={{ marginRight: 8 }}>
            {expandedSections.header ? "▾" : "▸"}
          </span>
          Header Definition
        </h3>
        {expandedSections.header && (
          <>
            <BitFieldEditor
              fields={schemas.header}
              setFields={(newFields) => updateSchema("header", newFields)}
            />
            <BitFieldPreviewer
              fields={schemas.header}
              sampleValues={sampleValues.header}
            />
          </>
        )}
      </div>

      {/* Item definition */}
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <h3
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={() => toggleSection("item")}
        >
          <span style={{ marginRight: 8 }}>
            {expandedSections.item ? "▾" : "▸"}
          </span>
          Item Definition (Single Item Preview)
        </h3>

        {expandedSections.item && (
          <>
            <BitFieldEditor
              fields={schemas.item}
              setFields={(newFields) => updateSchema("item", newFields)}
            />
            {/* Show only the first generated item */}
            <BitFieldPreviewer
              fields={schemas.item}
              sampleValues={sampleValues.items[0] ?? {}}
            />
          </>
        )}
      </div>
      <button onClick={handleGenerateRandom}>🎲 Generate Random Order</button>
    </div>
  );
}
