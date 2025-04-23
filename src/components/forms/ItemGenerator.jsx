import React, { useState } from "react";
import { useSchemaContext } from "../../state";

export function ItemGenerator() {
  const { fields: schema, requiredFieldNames, setData } = useSchemaContext();

  const [count, setCount] = useState(5);
  const [variantLength, setVariantLength] = useState(4);
  const [charset, setCharset] = useState("0123456789");
  const [minQty, setMinQty] = useState(1);
  const [maxQty, setMaxQty] = useState(5);

  const generateVariant = () =>
    Array.from({ length: variantLength }, () =>
      charset.charAt(Math.floor(Math.random() * charset.length))
    ).join("");

  const generateItems = () => {
    const itemsField = schema.find((f) => f.label === "Items");
    const variantField = itemsField?.children?.find((c) => c.label === "Variant");
    const variantFieldType = variantField?.type || "string";

    const newItems = Array.from({ length: count }, () => ({
      [requiredFieldNames.variantKey]:
        variantFieldType === "number"
          ? parseInt(generateVariant(), 10)
          : generateVariant(),
      [requiredFieldNames.quantityKey]:
        Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty,
    }));

    setData((prev) => ({
      ...prev,
      [requiredFieldNames.itemsKey]: newItems,
    }));
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
          value={Number.isFinite(count) ? count : ""}
          onChange={(e) => setCount(Number(e.target.value))}
          placeholder="Count"
        />
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Variant Len
        </div>
        <input
          className="border p-1 rounded w-20"
          type="number"
          value={Number.isFinite(variantLength) ? variantLength : ""}
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
          value={Number.isFinite(minQty) ? minQty : ""}
          onChange={(e) => setMinQty(Number(e.target.value))}
          placeholder="Min Qty"
        />
        <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
          Max Qty
        </div>
        <input
          className="border p-1 rounded w-20"
          type="number"
          value={Number.isFinite(maxQty) ? maxQty : ""}
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
