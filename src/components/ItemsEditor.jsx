// ItemsEditor.js
import React from "react";
import { updateAtPath } from "../utils/schemaUtils";

export default function ItemsEditor({
  items,
  setItems,
  fieldNames,
  setSchema,
}) {
  console.debug("ItemsEditor", { items, setItems, fieldNames });

  const handleItemChange = (index, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { [fieldNames.variantKey]: "", [fieldNames.quantityKey]: 0 },
    ]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="border p-1 rounded w-1/2"
            placeholder={fieldNames.variantKey}
            value={item[fieldNames.variantKey]}
            onChange={(e) =>
              handleItemChange(i, fieldNames.variantKey, e.target.value)
            }
          />
          <input
            className="border p-1 rounded w-1/4"
            type="number"
            placeholder={fieldNames.quantityKey}
            value={item[fieldNames.quantityKey]}
            onChange={(e) =>
              handleItemChange(
                i,
                fieldNames.quantityKey,
                Number(e.target.value)
              )
            }
          />
          <button onClick={() => removeItem(i)} className="text-red-500">
            ✖
          </button>
        </div>
      ))}
      <button onClick={addItem} className="text-blue-600 mt-2">
        + Add Item
      </button>
    </div>
  );
}
