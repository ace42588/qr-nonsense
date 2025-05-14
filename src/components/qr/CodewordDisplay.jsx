import { useRef, useEffect, useState } from "react";
import { useQRData, useQRDataDispatch } from "../../state";

import "../styles/styles.css";

export function CodewordDisplay() {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();
  const { highlightedIds, codewords } = useQRData();
  const [clicked, setClicked] = useState(false);
  console.debug("CodewordDisplay", { codewords, highlightedIds });

  const isHighlighted = (id) => {
    highlightedIds.includes(id);
  };

  const getClassName = (segment) => {
    return `${segment.type}-button${
      isHighlighted(segment.id) ? "-highlighted" : ""
    }`;
  };

  return (
    <div className="segment-display">
      <h3>Codewords</h3>
      <div className="segment-container">
        {codewords.map((codeword, index) => (
          <button
            key={codeword.id}
            className={getClassName(codeword)}
            onClick={() => {
              highlightModules(codeword.bits.map((b) => b.id));
              setClicked(!clicked);
            }}
            onMouseEnter={() => {
              if (!clicked) highlightModules(codeword.bits.map((b) => b.id));
            }}
            onMouseLeave={() => {
              if (!clicked) clearHighlightedModules(codeword.bits.map((b) => b.id));
            }}
            title={`Codeword ${codeword.id}`}
          >
            {codeword.subtype}
          </button>
        ))}
      </div>
    </div>
  );
}
