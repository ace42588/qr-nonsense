/**
export function estimateGridNonuniformity(data, width, height) {
  // In a real implementation, we would:
  // 1. Detect the module grid
  // 2. Measure deviation from ideal grid
  
  // For this example, returning a simulated value
  // Lower values indicate less nonuniformity (better)
  return 0.12;
}
*/

/**
 * Estimate grid nonuniformity
 */
export function estimateGridNonuniformity(data, width, height) {
  const moduleSize = Math.floor(width / 21);
  const verticalEdges = [];
  const horizontalEdges = [];

  function edgeProfile(start, end, step, fixed, isVertical) {
    const edges = [];
    for (let i = start; i < end; i += step) {
      let lastPixel = null;
      let edgeCount = 0;
      for (let j = 0; j < (isVertical ? height : width); j++) {
        const x = isVertical ? i : j;
        const y = isVertical ? j : i;
        const offset = (y * width + x) * 4;
        const pixel = data[offset];
        if (lastPixel !== null && (pixel < 128) !== (lastPixel < 128)) {
          edgeCount++;
        }
        lastPixel = pixel;
      }
      edges.push(edgeCount);
    }
    return edges;
  }

  verticalEdges.push(...edgeProfile(0, width, moduleSize, height, true));
  horizontalEdges.push(...edgeProfile(0, height, moduleSize, width, false));

  const idealEdges = 21;
  const verticalError = verticalEdges.reduce((acc, v) => acc + Math.abs(v - idealEdges), 0);
  const horizontalError = horizontalEdges.reduce((acc, v) => acc + Math.abs(v - idealEdges), 0);

  return (verticalError + horizontalError) / (verticalEdges.length + horizontalEdges.length) / idealEdges;
}

/**
 * Grade grid nonuniformity
 */
export function gradeGridNonuniformity(nonuniformity) {
  if (nonuniformity <= 0.10) return 'A';
  if (nonuniformity <= 0.15) return 'B';
  if (nonuniformity <= 0.20) return 'C';
  if (nonuniformity <= 0.25) return 'D';
  return 'F';
}
