import { useInputList } from "../../state";

import { useEffect, useState } from "react";
import sodium from "libsodium-wrappers-sumo";
import { keccak_256 } from "js-sha3";

// --- React Component ---



export function MACGenerator({ input, onChange }) {
  console.debug("MACGenerator", {input});
  const { inputs: allInputs } = useInputList();

  const currentId = input.id;
  const selectedIds = input.includedFields || [];

  const selectableInputs = allInputs.filter((i) => i.id !== currentId);

  const toggleSelection = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange({ ...input, includedFields: next });
  };

  useEffect(() => {
    async function generateMAC() {
      const selected = selectableInputs.filter((i) =>
        selectedIds.includes(i.id)
      );
      const message = selected.map((i) => i.data).join("");
      const fn = MAC_FUNCTIONS[input.algo];
      const result = await fn(message, input.key, 4); // 4 bytes
      handleUpdate(result);
    }
    generateMAC();
  }, [selectableInputs, selectedIds, input.algo, input.key]);

  const handleAlgoChange = (e) => {
    onChange?.({ ...input, algo: e.target.value });
  };

  const handleKeyChange = (e) => {
    onChange?.({ ...input, key: e.target.value });
  };

  const handleUpdate = (result) => {
    onChange?.({ ...input, data: result });
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
