let lastSegmentId = 0;

// ~24k bits possible
function getId() {
  if (lastSegmentId >= 0xffff) lastSegmentId = 0;

  return `segment-${lastSegmentId++}`;
}

function validateLength(data, min, max, type) {
  if (data.length < min || data.length > max) {
    throw new Error(
      `${type} segment must have between ${min} and ${max} characters.`
    );
  }
}

function makeSegment(value, text, inputMode) {
  return {
    type: "segment",
    id: getId(),
    value,
    text,
    inputMode,
    isHighlighted: false,
    length: 8,
  };
}

function computeIndicatorLength(charCount, mode) {
    if (!mode.thresholds) {
      throw new Error(
        `Mode ${mode.toString()} does not support a character count indicator.`
      );
    }
    const { thresholds } = mode;
    for (const { max, length } of thresholds) {
      if (charCount < max) return length;
    }
    return thresholds[thresholds.length - 1].length;
  }