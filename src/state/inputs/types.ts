import { Actions } from "./inputActions";

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
  encoding?: string | Record<string, unknown>;
  fields?: Field[];
  values?: any;
  layout?: any;
  obj?: any;
  key?: string;
  algo?: string;
  includedFields?: string[];
  template?: string;
  templateFields?: Record<string, unknown>;
  symbolIndex?: number;
  totalSymbols?: number;
  parity?: number;
  fnc1Position?: "first" | "second";
  applicationIndicator?: string | number;
  payloadMode?: "alphanumeric" | "byte" | "numeric";
  data: string;
  mode: string;
  text?: string;
  error?: string;
  qartVariation?: boolean;
}

export type ActivePayload = "a" | "b";

export interface InputState {
  formatInfo: {
    errorCorrectionLevel: number;
    version: number;
    dataMask: number | null;
  };
  inputs: Input[];
  activeInputID: string | null;
  /** Second payload list for Ambiguous / Embed modes. Ignored by other modes. */
  inputsB: Input[];
  activeInputIDB: string | null;
  activePayload: ActivePayload;
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
    activePayload?: ActivePayload;
  };
}
