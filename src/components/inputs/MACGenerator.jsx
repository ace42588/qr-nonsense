import { useMemo, useState } from "react";
import { useEncodedInputs, useInputs, useInputDispatch } from "../../state";
import { MAC_FUNCTIONS } from "../../domain";

export function MACGenerator({ id }) {
  const allInputs = useInputs();
  const { updateInput } = useInputDispatch();
  const previews = useEncodedInputs();

  const input = allInputs.find((i) => i.id === id);
  input.type = "mac";

  const selectedIds = input.includedFields || [];

  const selectableInputs = allInputs.filter(i => i.id !== id);
  const preview = previews[id];
  
  updateInput

  const emitChange = async (selectedIds, algo, key) => {
    const selected = selectableInputs.filter((i) => selectedIds.includes(i.id));
    const message = selected.map((i) => i.data).join("");
    console.debug("MACGenerator: emitChange", { message });
    const fn = MAC_FUNCTIONS[algo];
    try {
      const result = await fn(message, key, 4);
      onChange?.({
        ...input,
        mode: "byte",
        encoding: "hex",
        includedFields: selectedIds,
        algo,
        key,
        data: result,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAlgoChange = (e) => {
    emitChange(input.includedFields, e.target.value, input.key);
  };

  const handleKeyChange = (e) => {
    emitChange(input.includedFields, input.algo, e.target.value);
  };

  const toggleSelection = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    emitChange(next, input.algo, input.key);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">QR MAC Generator</h2>

      <label className="block font-medium">Secret Key</label>
      <input
        className="border p-1 w-full mb-2"
        value={input.key}
        onChange={handleKeyChange}
      />

      <label className="block font-medium">Select Fields</label>
      {selectableInputs.map((i) => (
        <label key={i.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(i.id)}
            onChange={() => toggleSelection(i.id)}
          />
          {i.label || i.id}
        </label>
      ))}

      <label className="block font-medium mt-2">MAC Algorithm</label>
      <select
        className="border p-1 w-full mb-2"
        value={input.algo}
        onChange={handleAlgoChange}
      >
        {Object.keys(MAC_FUNCTIONS).map((alg) => (
          <option key={alg} value={alg}>
            {alg}
          </option>
        ))}
      </select>

      <div className="bg-gray-100 p-2 rounded mt-4">
        <strong>MAC:</strong> <code>{input.data}</code>
      </div>
    </div>
  );
}
