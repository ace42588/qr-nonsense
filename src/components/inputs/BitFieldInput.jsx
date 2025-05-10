import React, { useMemo, useState, useEffect } from "react";
import {
  BitFieldEditor,
  BitFieldValues,
  BitFieldVisualizer,
  bytesToHex,
  encodeFieldsToBytes,
  generateBitLayout,
} from "./BitField";
import { TabSwitcher } from "../shared/TabSwitcher";
import { useEncodedInputs, useInputs, useInputDispatch } from "../../state";

export function BitFieldInput({ id }) {
  const inputs = useInputs();
  const { updateInput } = useInputDispatch();
  const previews = useEncodedInputs();

  const input = inputs.find((i) => i.id === id);
  input.type = "bitField";
  const {fields = [], values = {}} = input;
  const preview = previews[id] || {};

  const [tab, setTab] = useState("fields");

  const { encodedBytes, layout = [], totalBits = 0 } = preview;
  
  const handleChange = (field, value) =>
    updateInput({ ...input, [field]: value });

  return (
    <div
      style={{
        border: "1px solid #aaa",
        borderRadius: 8,
        padding: 16,
        maxWidth: 900,
      }}
    >
      <TabSwitcher
        options={[
          { value: "fields", label: "Fields" },
          { value: "values", label: "Values" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "values" ? (
        <BitFieldValues
          values={values}
          onChange={(e) => handleChange("values", e.target.value)}
          layout={layout}
        />
      ) : (
        <BitFieldEditor fields={fields} onChange={(e) => handleChange("fields", e.target.value)} />
      )}

      <BitFieldVisualizer layout={layout} totalBits={totalBits} />
      <div style={{ marginTop: 8 }}>
        {encodedBytes ? (
          <>
            <b>Encoded Bytes:</b> {encodedBytes}
          </>
        ) : (
          <span style={{ color: "red" }}>(missing or invalid values)</span>
        )}
      </div>
    </div>
  );
}
