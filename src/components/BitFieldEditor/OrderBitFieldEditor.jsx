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
    ]
  });

  function updateSchema(name, newFields) {
    setSchemas(prev => ({
      ...prev,
      [name]: newFields
    }));
  }

  return (
    <div style={{ padding: 32 }}>

      {/* Header definition */}
      <section style={{ marginBottom: 48 }}>
        <h2>Header Definition</h2>
        <BitFieldEditor
          fields={schemas.header}
          setFields={newFields => updateSchema("header", newFields)}
        />
        <BitFieldPreviewer
          fields={schemas.header}
        />
      </section>

      {/* Item definition */}
      <section style={{ marginBottom: 48 }}>
        <h2>Item Definition</h2>
        <BitFieldEditor
          fields={schemas.item}
          setFields={newFields => updateSchema("item", newFields)}
        />
        <BitFieldPreviewer
          fields={schemas.item}
        />
      </section>

    </div>
  );
}
