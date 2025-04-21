// Entry point component for editing full order structure
import React, { useState } from "react";
import SchemaEditor from "./SchemaEditor";
import ItemsEditor from "./ItemsEditor";
import ItemGenerator from "./ItemGenerator";
import { schemaToObject } from "../utils/schemaUtils";

export default function DynamicOrderEditor() {
  const [orderSchema, setOrderSchema] = useState([
    { label: "Platform", name: "p", type: "string", value: "A" },
    { label: "Conference Code", name: "cc", type: "number", value: "133" },
    { label: "Transaction ID", name: "txn", type: "string", value: "99999" }
  ]);
  const [items, setItems] = useState([
    { variant: 5432, quantity: 1 },
    { variant: 6666, quantity: 3 },
    { variant: 1234, quantity: 2 }
  ]);

  const itemFieldNames = {
    orderKey: "i",
    variantKey: "v",
    quantityKey: "q"
  };

  const finalOutput = buildFinalOrder(orderSchema, items, itemFieldNames);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Dynamic Order Editor</h1>

      <div className="border p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Order Fields</h2>
        <SchemaEditor schema={orderSchema} setSchema={setOrderSchema} />
      </div>

      <div className="border p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Order Items</h2>
        <ItemsEditor
          items={items}
          setItems={setItems}
          fieldNames={itemFieldNames}
        />
        <ItemGenerator onGenerate={setItems} fieldNames={itemFieldNames} />
      </div>

      <div className="border p-4 rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Output</h2>
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(finalOutput, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function buildFinalOrder(orderSchema, items, fieldNames) {
  const obj = schemaToObject(orderSchema);
  obj[fieldNames.orderKey] = items.map((item) => ({
    [fieldNames.variantKey]: item.variant,
    [fieldNames.quantityKey]: item.quantity
  }));
  return obj;
}
