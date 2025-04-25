import { getEncoder } from "./encoders/Encoders";

export function deriveSegmentsFromInputs(inputs) {
  const segments = inputs.map(({ data, mode, encoding }) =>
    getEncoder(mode).encode(data, encoding)
  );
  return segments;
}