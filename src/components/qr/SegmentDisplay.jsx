import { useRef, useEffect, useState } from "react";
import { Actions } from "../../state/qr/Constants";
import { useQRData, useQRDataDispatch } from "../../state";
import "../styles/styles.css";

export function SegmentDisplay({ bitStream }) {
  const { segments, segmentMap, bitMap } = useQRData();
  const dispatch = useQRDataDispatch();

  const handleSegmentClick = (segment) => {
    dispatch({
      type: Actions.HighlightModules,
      segment: { id: segment },
    });
  };

  const handleMouseEnter = (segment) => {
    dispatch({
      type: Actions.HighlightModules,
      segment: { id: segment },
    });
  };

  const handleMouseLeave = (segment) => {
    dispatch({
      type: Actions.HighlightModules,
      segment: { id: segment },
    });
  };

  const getClassName = (type, isHighlighted) => {
    return `${type}-button${isHighlighted ? "-highlighted" : ""}`;
  };

  return (
    <div className="segment-display">
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map((segment, index) => (
          <button
            key={segment.id}
            className={getClassName(segment.type, segment.isHighlighted)}
            onClick={() => handleSegmentClick(segment)}
            onMouseEnter={() => handleSegmentClick(segment)}
            onMouseLeave={() => handleSegmentClick(segment)}
            title={`Segment ${segment.id}`}
          >
            {segment.text}
          </button>
        ))}
      </div>
    </div>
  );
}
