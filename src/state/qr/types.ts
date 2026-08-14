import { QRMatrix, Segment } from "@/domain/shared/types";
import { Input } from "@/state/inputs/types";

export interface QRState {
  errorCorrectionLevel: number;
  version: number;
  dataMask: number | null;
  inputs: Input[];
  matrix: QRMatrix;
  source: "inputs" | "manual";
  error: string;
  highlightedIds: string[];
  segments: Segment[];
}
