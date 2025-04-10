import React from "react";
import "./SegmentDisplay.css";

function SegmentDisplay({ segments, matrix, setMatrix }) {
  const handleSegmentClick = (segment) => {
    const newMatrix = matrix.map((row) =>
      row.map((module) => {
        if (module.segment === segment) {
          module.highlight();
        }
        return module;
      })
    );
    setMatrix(newMatrix); // Update the matrix state to trigger a re-render
  };

  return (
    <div className="segment-display">
      <h3>Segments</h3>
      <div className="segment-container">
        {segments.map((segment, index) => (
          <button
            key={index}
            className="segment-button"
            onClick={() => handleSegmentClick(segment)}
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
