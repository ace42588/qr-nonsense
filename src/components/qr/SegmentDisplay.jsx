import { useRef, useEffect, useState } from "react";
import { Actions } from "../../domain/qr/Constants";;
import { useQRData, useQRDataDispatch } from "../../state";
import "../styles/styles.css";

export function SegmentDisplay({ bitStream }) {
  const { segments, segmentMap, bitMap } = useQRData();
  const dispatch = useQRDataDispatch();

  const handleSegmentClick = (segmentId) => {
    dispatch({
      type: Actions.HighlightModules,
      segment: { id: segmentId },
    });
  };
  
  const handleHighlight = (segment)

  const getClassName = (type, isHighlighted) => {
    return `${type}-button${isHighlighted ? "-highlighted" : ""}`;
  };

  return (
    <div className="segment-display">
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map(({ id, type, text, isHighlighted }, index) => (
          <button
            key={id}
            className={getClassName(type, isHighlighted)}
            onClick={() => handleSegmentClick(id)}
            onMouseEnter={() => handleSegmentClick(id)}
      onMouseLeave={handleMouseLeave}
            title={`Segment ${id}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
