// ItemGenerator.js
import React, { useState } from "react";
import { useSchemaContext } from "../context/SchemaContext";

export default function ItemGenerator({ onGenerate, fieldNames }) {
  const [count, setCount] = useState(5);
  const [variantLength, setVariantLength] = useState(4);
  const [charset, setCharset] = useState("0123456789");
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState(5);

  const generateItems = () => {
    const rand = (len, chars) =>
      Array.from(
        { length: len },
        () => chars[Math.floor(Math.random() * chars.length)]
      ).join("");

    const generated = Array.from({ length: count }, () => ({
      [fieldNames.variantKey]: rand(variantLength, charset),
      [fieldNames.quantityKey]:
        Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty,
    }));

    onGenerate(generated);
  };

  return (
    <div className="mt-4 space-y-2">
      <h3 className="font-semibold">Auto-generate Items</h3>
      <div className="flex flex-wrap gap-2">
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Count
        </div>
        <input
          className="border p-1 rounded w-20"
          type="number"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          placeholder="Count"
        />
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Variant Len
        </div>
        <input
          className="border p-1 rounded w-20"
          type="number"
          value={variantLength}
          onChange={(e) => setVariantLength(Number(e.target.value))}
          placeholder="Variant Len"
        />
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Charset
        </div>
        <input
          className="border p-1 rounded w-24"
          value={charset}
          onChange={(e) => setCharset(e.target.value)}
          placeholder="Charset"
        />
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Min Qty
        </div>
        <input
          className="border p-1 rounded w-20"
          type="number"
          value={minQty}
          onChange={(e) => setMinQty(Number(e.target.value))}
          placeholder="Min Qty"
        />
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Max Qty
        </div>
        <input
          className="border p-1 rounded w-20"
          type="number"
          value={maxQty}
          onChange={(e) => setMaxQty(Number(e.target.value))}
          placeholder="Max Qty"
        />
        <button onClick={generateItems} className="text-blue-600">
          Generate
        </button>
      </div>
    </div>
  );
}
