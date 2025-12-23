/**
 * Application/UI layer types
 * These types are specific to the UI and state management
 */

import { Actions } from "@/state/inputs/inputActions";
import { QRMatrix, Segment } from "@/domain/shared/types";

export interface Field {
  id: string;
  label?: string;
  min?: number;
  max?: number;
  bitWidth?: number;
  type?: string;
  mode?: string;
  bits?: number;
  startBit?: number;
  endBit?: number;
  width?: number;
}

export interface Input {
  id: string;
  label?: string;
  type: string;
  schemaName?: string;
  schema?: any;
  encoding?: string;
  fields?: Field[];
  values?: any;
  layout?: any;
  obj?: any;
  key?: string;
  algo?: string;
  includedFields?: string[];
  data: string;
  mode: string;
}

export interface InputState {
  formatInfo: {
    errorCorrectionLevel: number;
    version: number;
    dataMask: number;
  };
  inputs: Input[];
  activeInputID: string;
}

export interface InputAction {
  type: Actions;
  payload?: {
    id?: string;
    partial?: Partial<Input>;
    name?: string;
    schema?: any;
    encoding?: string;
    newType?: string;
    oldIndex?: number;
    newIndex?: number;
    label?: string;
    fieldId?: string;
    updatedValues?: any;
    obj?: any;
    key?: string;
    algo?: string;
    includedFields?: string[];
    field?: string;
    value?: any;
  };
}

export interface QRState {
  errorCorrectionLevel: number;
  version: number; // -1 means "auto"
  dataMask: number; // -1 means "auto"
  inputs: Input[];
  matrix: QRMatrix; // used when modified manually
  source: "inputs" | "manual";
  error: string;
  highlightedIds: string[];
  segments: Segment[];
}

