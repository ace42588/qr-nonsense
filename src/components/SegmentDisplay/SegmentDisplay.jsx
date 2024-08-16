import React from 'react';
import './SegmentDisplay.css';

function SegmentDisplay({ segments, onSegmentClick }) {
  return (
    <div className="segment-display">
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map((segment, index) => (
          <button
            key={index}
            className="segment-button"
            onClick={() => onSegmentClick(segment, index)}
            title={`Segment ${index + 1}`}
          >
            {segment.toString()}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SegmentDisplay;
