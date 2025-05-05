import { useRef, useEffect, useState } from "react";
import { Actions, useQRData, useQRDataDispatch } from "../../state";
import "../styles/styles.css";

export function SegmentDisplay({ bitStream }) {
  const { segments, segmentMap, bitMap } = useQRData();
  const dispatch = useQRDataDispatch();

  const handleSegmentClick = (segment) => {
    dispatch({
      type: Actions.HighlightModules,
      payload: segment,
    });
  };

  const handleMouseEnter = (segment) => {
    if (!segment.isHighlighted) {
      dispatch({
        type: Actions.HighlightModules,
        payload: segment,
      });
    }
  };

  const handleMouseLeave = (segment) => {
    dispatch({
      type: Actions.HighlightModules,
      payload: segment,
    });
  };

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
            onClick={() => handleSegmentClick(segment)}
            onMouseEnter={() => handleSegmentClick(segment)}
            onMouseLeave={() => handleSegmentClick(segment)}
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
