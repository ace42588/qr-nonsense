import { useRef, useEffect, useState } from "react";
import { Actions } from "../Constants";
import { useQRData, useQRDataDispatch } from "../context/QRDataContext";
import "./styles.css";

export default function SegmentDisplay({ bitStream }) {
  const { segments, segmentMap, bitMap } = useQRData();
  const dispatch = useQRDataDispatch();

  const handleSegmentClick = (segment) => {
    dispatch({
      type: Actions.HighlightModules,
      segment
    });
  };

  return (
    <div className="segment-display">
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map(({id, text, isHighlighted}, index) => (
          <button
            key={id}
            className="segment-button"
            onClick={() => handleSegmentClick(segment)}
            title={`Segment ${index + 1}`}
          >
            {segment.text}
          </button>
        ))}
      </div>
    </div>
  );
}
