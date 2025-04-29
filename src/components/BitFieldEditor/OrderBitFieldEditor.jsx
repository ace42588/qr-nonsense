import React, { useState } from "react";
import BitFieldSection from "./BitFieldSection";

import {
  generateBitLayout,
  generateRandomOrder,
  encodeFieldsToBytes,
  bytesToHex,
} from "./utils"; // utility functions

export default function OrderBitFieldEditor() {
  const [headerFields, setHeaderFields] = useState([
    { id: "0", label: "platform", min: 0, max: 3 },
    { id: "1", label: "confId", min: 0, max: 255 },
    { id: "2", label: "transactionId", min: 0, max: 1048575 },
  ]);

  const [itemFields, setItemFields] = useState([
    { id: "0", label: "variant", min: 0, max: 65535 },
    { id: "1", label: "quantity", min: 0, max: 255 },
  ]);

  const [headerSample, setHeaderSample] = useState({});
  const [itemSamples, setItemSamples] = useState([]);
  const [itemCount, setItemCount] = useState(5);

  function handleGenerateRandom() {
    const { headerValues, items } = generateRandomOrder({
      headerFields,
      itemFields,
      itemCount,
    });
    console.debug("handleGenerateRandom", { headerValues, items });

    setHeaderSample(headerValues);
    setItemSamples(items);

    const headerBytes = bytesToHex(
      encodeFieldsToBytes(generateBitLayout(headerFields).layout, headerValues)
    );
    const itemsBytes = bytesToHex(
      encodeFieldsToBytes(generateBitLayout(itemFields).layout, items)
    );
    console.debug("handleGenerateRandom", { headerBytes, itemsBytes });
  }

  return (
    <div className="input-form">
      {/* Header definition */}

      <BitFieldSection
        title="Header Definition"
        fields={headerFields}
        setFields={setHeaderFields}
        sampleValues={headerSample}
      />

      {/* Item definition */}
      <BitFieldSection
        title="Item Definition"
        fields={itemFields}
        setFields={setItemFields}
        sampleValues={itemSamples[0] ?? {}}
      />
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      >
        <div className="input-button-row">
          <button
            style={{ width: 220, maxWidth: 220 }}
            onClick={handleGenerateRandom}
          >
            🎲 Generate Random Order
          </button>
          <label htmlFor="numItems">Number of items:</label>
          <input
            id="numItems"
            type="number"
            min={1}
            value={itemCount}
            onChange={(e) => setItemCount(parseInt(e.target.value, 10) || 1)}
            placeholder={5}
          />
        </div>
      </div>
    </div>
  );
}
