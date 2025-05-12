import { useRef, useEffect, useState } from "react";
import { useQRData, useDerivedQRData, useQRDataDispatch } from "../../state";

import "../styles/styles.css";

export function SegmentDisplay() {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();
  const { highlightedIds } = useQRData();
  const { segments, idMap } = useDerivedQRData();
  //console.debug("SegmentDisplay", { segments, idMap, highlightedIds });

  const isHighlighted = (id) => {
    //console.debug("isHighlighted", {highlightedIds, id});
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
            onClick={() => highlightModules(segment.id)}
            onMouseEnter={() => highlightModules(idMap.get(segment.id))}
            onMouseLeave={() => clearHighlightedModules(idMap.get(segment.id))}
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
