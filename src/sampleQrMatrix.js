import { generateQRCodeMatrix } from "domain/qr/generateMatrix";
import { useQRDispatch, useQRSegments } from "state";
import { createSegment } from "state/qr/segmentUtils";

function encodeAndUpdateState(input, mode, version, errorCorrectionLevel, dataMask) {
  const { setSegments } = useQRSegments();
  const dispatch = useQRDispatch();

  // 1. encode bits
  const rawEncoded = encodeInput(mode, input);

  // 2. wrap in segment metadata
  const segment = createSegment(input, mode, rawEncoded);

  // 3. encode matrix and capture module mappings
  const { matrix, dataMask: selectedMask, segmentModules } = generateQRCodeMatrix({
    version,
    errorCorrectionLevel,
    dataMask,
    codewords: [/* from segment.bits */],  // match how you build codewords
    segments: [segment],
  });

  // 4. enrich segment with its moduleIndices
  segment.moduleIndices = segmentModules[segment.id] || [];

  // 5. update state
  dispatch({ type: "SET_MATRIX", payload: matrix });
  dispatch({ type: "SET_SELECTED_MASK", payload: selectedMask });
  setSegments([segment]);
}
