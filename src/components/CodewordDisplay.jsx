import { useRef, useEffect, useState } from "react";
import { useQRData, useQRDataDispatch } from "../state";

export function CodewordDisplay() {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();
  const { highlightedIds, codewords } = useQRData();
  const [clicked, setClicked] = useState(false);
  console.debug("CodewordDisplay", { codewords, highlightedIds });

  const isHighlighted = (id) => {
    highlightedIds.includes(id);
  };

  return (
    <div className="segment-display">
      <h3>Codewords</h3>
      <div className="segment-container">
        {codewords.map((codeword, index) => (
          <button
            key={codeword.id}
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
            {codeword.type}
          </button>
        ))}
      </div>
    </div>
  );
}
