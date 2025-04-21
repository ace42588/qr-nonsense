import React from "react";

export default function FieldEditor({
  field,
  path,
  onChange,
  onAddChild,
  onRemove,
}) {
  const handleChange = (key, value) => onChange(path, key, value);

  return (
    <div className="border p-2 mb-2 rounded relative bg-white">
      <button
        className="absolute top-1 right-1 text-red-500 text-sm"
        onClick={() => {
          const mandatoryLabels = [
            "Platform",
            "Conference Code",
            "Transaction ID",
          ];
          if (!mandatoryLabels.includes(field.label)) onRemove(path);
        }}
      >
        ✖
      </button>

      <div className="flex gap-2 mb-2">
        {["Platform", "Conference Code", "Transaction ID"].includes(
          field.label
        ) ? (
          <div className="p-1 flex-1 bg-gray-100 text-gray-700 rounded border border-gray-300">
            {field.label}
          </div>
        ) : (
          <input
            className="border p-1 flex-1"
            placeholder="Label"
            value={field.label}
            onChange={(e) => handleChange("label", e.target.value)}
          />
        )}
        <input
          className="border p-1 flex-1"
          placeholder="Field name"
          value={field.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        <select
          className="border p-1"
          value={field.type}
          onChange={(e) => handleChange("type", e.target.value)}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="object">Object</option>
          <option value="array">Array</option>
        </select>
      </div>

      {field.type === "string" || field.type === "number" ? (
        <input
          className="border p-1 w-full"
          placeholder="Value"
          value={field.value}
          onChange={(e) => handleChange("value", e.target.value)}
        />
      ) : null}

      {(field.type === "object" || field.type === "array") && (
        <div className="ml-4 mt-2">
          {(field.children || []).map((child, i) => (
            <FieldEditor
              key={i}
              field={child}
              path={[...path, "children", i]}
              onChange={onChange}
              onAddChild={onAddChild}
              onRemove={onRemove}
            />
          ))}
          <button
            className="text-sm text-blue-600 mt-1"
            onClick={() => onAddChild([...path, "children"])}
          >
            + Add Child Field
          </button>
        </div>
      )}
    </div>
  );
}
