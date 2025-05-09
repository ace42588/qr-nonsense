import {
  encodeInput,
  //finalizeEncoding,
  generateMatrix,
  getBits,
  getCodewords,
  getMinimumQRCodeVersion,
  getRequiredDataCodewords,
  getEncodedMessage
} from "../../domain/qr";

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

const isBinary = (str) =>
  /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(str);
const isHex = (str) =>
  /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(str);

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
