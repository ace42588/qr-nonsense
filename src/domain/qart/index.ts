/**
 * QArt-style QR code generation
 *
 * Implements the QArt algorithm from Russ Cox's research:
 * https://research.swtch.com/qart
 */

import {
  generateQArtViaPipeline,
} from "@/domain/pipeline/adapters";
import type { QArtOptions, QArtResult } from "./types";

export type {
  QArtAppendData,
  QArtOptimizedAppendData,
  QArtOptions,
  QArtResult,
} from "./types";

export {
  appendQArtData,
  prepareImageGrids,
  optimizeQArtBlocks,
  qartSelectEditable,
  qartBitPriority,
  qartSolve,
  rebuildFromBlocks,
  finalizeQArtMatrix,
  extractOptimizedAppendData,
  deepCopyBlock,
} from "./stages";
export type { QArtEditableSelection } from "./stages";

/**
 * Generate QArt QR code via pipeline stage nodes.
 */
export async function generateQArt(options: QArtOptions): Promise<QArtResult> {
  return generateQArtViaPipeline(options);
}
