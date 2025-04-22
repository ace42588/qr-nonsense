function encodeAlphanumeric(data) {
  validateLength(data, 1, 2, "Alphanumeric");
  let value = AlphaNumCharMap.indexOf(data[0]);
  let length = 6;
  if (data.length === 2) {
    value =
      AlphaNumCharMap.indexOf(data[0]) * 45 + AlphaNumCharMap.indexOf(data[1]);
    length = 11;
  }
  return { value, length };
}

function  encode(data, inputEncoding) {
    let segments = [...createSegments(data, this.mode, inputEncoding)];
    const mode = {
      id: getId(),
      type: "modeIndicator",
      value: this.mode.bits,
      text: this.mode.name,
      isHighlighted: false,
      length: 4,
    };
    const characterCount = {
      id: getId(),
      type: "characterCountIndicator",
      value: data.length,
      text: data.length,
      length: Encoder.computeIndicatorLength(segments.length, this.mode),
      isHighlighted: false,
    };
    segments = [mode, characterCount, ...segments];

    const bitMap = new Map();
    const segmentMap = new Map();

    const modeBits = getBits(mode.value, mode.length);
    modeBits.forEach(({ id }) => bitMap.set(id, mode));
    //mode.bitIds = modeBits.map(({ id }) => id);
    const charCountBits = getBits(characterCount.value, characterCount.length);
    charCountBits.forEach(({ id }) => bitMap.set(id, characterCount));
    //characterCount.bitIds = charCountBits.map(({ id }) => id);
    const segmentBits = segments.flatMap((segment) => {
      const bits = getBits(segment.value, segment.length);
      segmentMap.set(segment.id, bits.map(({id}) => id));
      bits.forEach(({ id }) => bitMap.set(id, segment));
      return bits;
    });
    const bits = [...segmentBits];
    //mode.bitIds = modeBits.map(({ id }) => id);
    //characterCount.bitIds = charCountBits.map(({ id }) => id);
    //segments.bitIds = segmentBits.map(({ id }) => id);

    const encoded = {
      mode,
      characterCount,
      segments,
      segmentMap,
      bits,
      bitMap,
    };
    return encoded;
  }