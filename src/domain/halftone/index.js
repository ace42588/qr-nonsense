/**
 * Pure utility functions for halftone processing.
 * These functions operate on canvas contexts and image data without DOM manipulation.
 */

/**
 * Convert 2D position to ImageData array index
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate  
 * @param {number} width - Image width
 * @returns {number} Index in ImageData.data array
 */
export function positionToDataIndex(x, y, width) {
  // data is arranged as [R, G, B, A, R, G, B, A, ...]
  return (y * width + x) * 4;
}

/**
 * Re-map a value from its original range [minA, maxA] to the range [minB, maxB]
 * @param {number} value - Value to remap
 * @param {number} minA - Source minimum
 * @param {number} maxA - Source maximum
 * @param {number} minB - Target minimum
 * @param {number} maxB - Target maximum
 * @returns {number} Remapped value
 */
export function map(value, minA, maxA, minB, maxB) {
  return ((value - minA) / (maxA - minA)) * (maxB - minB) + minB;
}

/**
 * Rotate a point about a given position
 * @param {number[]} point - [x, y] coordinates
 * @param {number[]} center - [x, y] rotation center
 * @param {number} angle - Rotation angle in radians
 * @returns {number[]} Rotated [x, y] coordinates
 */
export function rotatePointAboutPosition([x, y], [rotX, rotY], angle) {
  return [
    (x - rotX) * Math.cos(angle) - (y - rotY) * Math.sin(angle) + rotX,
    (x - rotX) * Math.sin(angle) + (y - rotY) * Math.cos(angle) + rotY,
  ];
}

/**
 * Apply halftone effect to image data
 * @param {Object} options - Halftone options
 * @param {number} options.angle - Halftone angle in degrees
 * @param {number} options.dotSize - Maximum dot size
 * @param {number} options.dotResolution - Spacing between dots
 * @param {CanvasRenderingContext2D} options.targetCtx - Target canvas context
 * @param {CanvasRenderingContext2D} options.sourceCtx - Source canvas context
 * @param {number} options.width - Image width
 * @param {number} options.height - Image height
 * @param {string} options.color - Dot color (default: "black")
 * @param {boolean} options.layer - Whether to clear background
 */
export function halftone({
  angle,
  dotSize,
  dotResolution,
  targetCtx,
  sourceCtx,
  width,
  height,
  color,
  layer,
}) {
  const sourceImageData = sourceCtx.getImageData(0, 0, width, height);
  angle = (angle * Math.PI) / 180;
  targetCtx.fillStyle = "white";
  if (!layer) {
    targetCtx.fillRect(0, 0, width, height);
  }
  targetCtx.fillStyle = color || "black";
  // get the four corners of the screen
  const tl = [0, 0];
  const tr = [width, 0];
  const br = [width, height];
  const bl = [0, height];
  // rotate the screen, then find the minimum and maximum of the values.
  const boundaries = [tl, br, tr, bl].map(([x, y]) => {
    return rotatePointAboutPosition([x, y], [width / 2, height / 2], angle);
  });
  const minX = Math.min(...boundaries.map((point) => point[0])) | 0;
  const minY = Math.min(...boundaries.map((point) => point[1])) | 0;
  const maxY = Math.max(...boundaries.map((point) => point[1])) | 0;
  const maxX = Math.max(...boundaries.map((point) => point[0])) | 0;

  for (let y = minY; y < maxY; y += dotResolution) {
    for (let x = minX; x < maxX; x += dotResolution) {
      let [rotatedX, rotatedY] = rotatePointAboutPosition(
        [x, y],
        [width / 2, height / 2],
        -angle
      );

      if (
        rotatedX < 0 ||
        rotatedY < 0 ||
        rotatedX > width ||
        rotatedY > height
      ) {
        continue;
      }
      const index = positionToDataIndex(
        Math.floor(rotatedX),
        Math.floor(rotatedY),
        width
      );
      // we're always operating on grayscale images, so just grab the value from
      // the red channel.
      const value = sourceImageData.data[index];
      const alpha = sourceImageData.data[index + 3];
      if (alpha) {
        const circleRadius = map(value, 0, 255, dotSize / 2, 0);
        targetCtx.beginPath();
        targetCtx.arc(rotatedX, rotatedY, circleRadius, 0, Math.PI * 2);
        targetCtx.closePath();
        targetCtx.fill();
      }
    }
  }
}
