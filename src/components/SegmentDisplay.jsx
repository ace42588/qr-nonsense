import React from 'react';

function SegmentDisplay({ segments }) {
  return (
    <div>
      <h3>Segment Values:</h3>
      <ul>
        {segments.map((segment, index) => (
          <li key={index}>{segment.data}</li>
        ))}
      </ul>
    </div>
  );
}

export default SegmentDisplay;
