import { useRef, useEffect, useState } from "react";
import { useQRData, useQRDataDispatch } from "../state";

export function SegmentDisplay() {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();
  const { highlightedIds, segments } = useQRData();
  const [clicked, setClicked] = useState(false);
  //console.debug("SegmentDisplay", { segments, highlightedIds });

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
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map((segment, index) => (
          <button
            key={segment.id}
            className={getClassName(segment)}
            onClick={() => {
              highlightModules(segment.bitIds);
              setClicked(!clicked);
            }}
            onMouseEnter={() => {
              if (!clicked) highlightModules(segment.bitIds);
            }}
            onMouseLeave={() => {
              if (!clicked) clearHighlightedModules(segment.bitIds);
            }}
            title={`Segment ${segment.id}`}
          >
            {segment.type !== "codon"
              ? `${segment.type}: ${segment.text}`
              : segment.text}
          </button>
        ))}
      </div>
    </div>
  );
}
