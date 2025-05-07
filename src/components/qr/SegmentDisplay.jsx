import { useRef, useEffect, useState } from "react";
import { useQRData, useQRMessage } from "../../state";
import "../styles/styles.css";

export function SegmentDisplay({ bitStream }) {
  const { highlightedIds } = useQRData();
  //console.debug("SegmentDisplay", {highlightedIds});
  const { segments, highlightModules, clearHighlightedModules } =
    useQRMessage();

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
            onClick={() => highlightModules(segment)}
            onMouseEnter={() => highlightModules(segment)}
            onMouseLeave={() => clearHighlightedModules(segment)}
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
