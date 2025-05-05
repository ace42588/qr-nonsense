import { useRef, useEffect, useState } from "react";
import { useQRMessage } from "../../state";
import "../styles/styles.css";

export function SegmentDisplay({ bitStream }) {
  const { segments, setSegments, highlightModules } = useQRMessage();

  const getClassName = (segment) => {
    return `${segment.type}-button${
      segment.isHighlighted ? "-highlighted" : ""
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
            onMouseLeave={() => highlightModules(segment)}
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
