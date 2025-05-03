import { useState } from "react";
import "../styles/styles.css";

import { BasicInput, JsonInput } from "../inputs";
import BitFieldSection from "../BitFieldEditor/BitFieldSection";

export function InputSection() {
  const [input, setInput] = useState();
  const [method, setMethod] = useState();

  const handleMethodChange = () => {};

  return (
    <div className="row">
      <div
        style={{
          border: "1px solid #aaa",
          borderRadius: 8,
          padding: 16,
          maxWidth: 900,
        }}
      ></div>
    </div>
  );
}
