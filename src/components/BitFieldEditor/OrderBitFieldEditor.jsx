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

  function updateSchema(name, newFields) {
    console.debug("updateSchema", {name, newFields});
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
    console.debug("handleGenerateRandom",{ headerValues, items });

    setSampleValues({
      header: headerValues,
      items: items,
    });
  }

return (
    <div style={{ padding: 32 }}>

      <button
        onClick={handleGenerateRandom}
        style={{ marginBottom: 32, padding: "8px 16px", fontSize: 16 }}
      >
        🎲 Generate Random Order
      </button>

      {/* Header definition */}
      <section style={{ marginBottom: 48 }}>
        <h2>Header Definition</h2>
        <BitFieldEditor
          fields={schemas.header}
          setFields={newFields => updateSchema("header", newFields)}
        />
        <BitFieldPreviewer
          fields={schemas.header}
          sampleValues={sampleValues.header}
        />
      </section>

      {/* Item definition */}
      <section style={{ marginBottom: 48 }}>
        <h2>Item Definition (Single Item Preview)</h2>
        <BitFieldEditor
          fields={schemas.item}
          setFields={newFields => updateSchema("item", newFields)}
        />
        {/* Show only the first generated item */}
        <BitFieldPreviewer
          fields={schemas.item}
          sampleValues={sampleValues.items[0] ?? {}}
        />
      </section>
    </div>
  );
}
