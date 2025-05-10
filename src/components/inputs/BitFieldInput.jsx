import React, { useMemo, useState, useEffect } from "react";
import { BitFieldEditor } from "./BitField/BitFieldEditor";
import { BitFieldValues } from "./BitField/BitFieldValues";
import { BitFieldVisualizer } from "./BitField/BitFieldVisualizer";

import { TabSwitcher } from "../shared/TabSwitcher";
import { useParsedInputs } from "../../state";

export function BitFieldInput({ id, input }) {
  const { encodedBytes } = useParsedInputs()[id];

  const [tab, setTab] = useState("fields");
  
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
        <BitFieldValues id={id} input={input} />
      ) : (
        <BitFieldEditor id={id} input={input} />
      )}

      <BitFieldVisualizer id={id} input={input} />
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
