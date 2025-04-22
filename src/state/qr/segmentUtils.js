let lastSegmentId = 0;

// ~24k bits possible
function getNextSegmentId() {
  if (lastSegmentId >= 0xffff) lastSegmentId = 0;

  return `segment-${lastSegmentId++}`;
}

function createSegment({ text, mode, rawBits }) {
  const id = getNextSegmentId();
  const bits = rawBits.map((bit, idx) => ({
    bit,
    sourceIndex: idx,
  }));

  return {
    id,
    text,
    mode,
    bits,
    isHighlighted: false,
  };
}
