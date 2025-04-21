import { useRef, useEffect, useState } from "react";
import { Actions } from "../Constants";
import { useQRData, useQRDataDispatch } from "../context/QRDataContext";
import "./styles.css";

export default function SegmentDisplay({ bitStream }) {
  const { segments, segmentMap, bitMap } = useQRData();
  const dispatch = useQRDataDispatch();

  const handleSegmentClick = (segmentId) => {
    dispatch({
      type: Actions.HighlightModules,
      segment: {id: segmentId}
    });
  };

  return (
    <div className="segment-display">
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map(({id, type, text, isHighlighted}, index) => (
          <button
            key={id}
            className={isHighlighted ? "segment-button-highlighted": "segment-button" }
            onClick={() => handleSegmentClick(id)}
            title={`Segment ${index + 1}`}
          >
            {type !== "segment"}
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
