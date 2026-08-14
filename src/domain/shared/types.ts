/**
 * Shared domain types used across domain modules
 * These types are pure domain logic and have no UI/application dependencies
 */

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

export interface VersionInfo {
  version: number;
  capacity: number;
  ecCodewordsPerBlock: number;
  ecBlocks: ECBlock[];
  remainderBits: number;
  requiredDataCodewords: number;
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

export interface QRMatrix extends Array<QRModule[]> {
  /**
   * Gets a module by its bit ID.
   * 
   * @param bitId - The bit ID to look up
   * @returns The module if found, undefined otherwise
   */
  getModuleByBitId?(bitId: string): QRModule | undefined;
}

export interface Segment {
  value: number;
  length: number;
  id: string;
  type?: string;
  text?: string;
  bitIds?: string[];
  inputId?: string;
  inputMode?: string;
}

