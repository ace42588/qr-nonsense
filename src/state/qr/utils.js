export function getModulesToHighlight(segment, state) {
  const { id } = segment;
  const { idMap } = state;
  return idMap.get(id);
}

export function highlightModules(segment, state) {
  const modulesToUpdate = getModulesToHighlight(segment, state);
  const newMatrix = state.matrix.map((row) =>
    row.map((module) => {
      let { bit, isHighlighted } = module;
      const newModule = { ...module };
      if (bit.id && modulesToUpdate.some((id) => id === bit.id)) {
        newModule.isHighlighted = !isHighlighted;
      }
      return newModule;
    })
  );
  return newMatrix;
}

export function getSegmentToHighlight(module, state) {
  const {
    bit: { id },
  } = module;
  const { idMap } = state;
  return idMap.get(id);
}

export function highlightSegment(module, state) {
  const segmentToUpdate = getSegmentToHighlight(module, state);
  //console.debug("highlightSegment", {segmentToUpdate});
  const newSegments = state.segments.map((segment) => {
    let { id, isHighlighted } = segment;
    const newSegment = { ...segment };
    if (id === segmentToUpdate) newSegment.isHighlighted = !isHighlighted;
    return newSegment;
  });
  return newSegments;
}