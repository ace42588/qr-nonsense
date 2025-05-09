export function highlightModules(segment, idMap, matrix) {
  console.debug("highlightModules", { segment, idMap, matrix });
  const modulesToUpdate = idMap.get(segment.id);
  const newMatrix = matrix.map((row) =>
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

export function highlightSegment(module, idMap, segments) {
  const segmentToUpdate = idMap.get(module.id);
  //console.debug("highlightSegment", {segmentToUpdate});
  const newSegments = segments.map((segment) => {
    let { id, isHighlighted } = segment;
    const newSegment = { ...segment };
    if (id === segmentToUpdate) newSegment.isHighlighted = !isHighlighted;
    return newSegment;
  });
  return newSegments;
}
