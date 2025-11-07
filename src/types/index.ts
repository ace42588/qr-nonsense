import { Actions } from "@/state/inputs/inputActions";

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

export interface VersionInfo {
    version: number;
    capacity: number;
    ecCodewordsPerBlock: number;
    ecBlocks: ECBlock[];
    remainderBits: number;
    requiredDataCodewords: number;
}

export interface Codeword {
    type: "data" | "errorCorrection";
    id: string;
    bits: Bit[];
    source?: Source;
}

export interface ECBlock {
    numBlocks: number;
    dataCodewordsPerBlock: number;
}

export interface Bit {
    type?: string;
    value: number;
    id: string;
    sourceId: string;
}

export interface Source {
    id: string;
    name?: string;
    type?: string;
}

export interface QRModule {
    id: string;
    bitId: string;
    bit: Bit;
    x: number;
    y: number;
    isDark: boolean;
    isMasked: boolean;
    type: string;
    nonData?: boolean;
    source?: Source;
}

export type QRMatrix = QRModule[][];

export interface Segment {
    value: number;
    length: number;
    id: string;
    type?: string;
    bitIds?: string[];
} 