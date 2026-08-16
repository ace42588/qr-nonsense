/**
 * QArt QR Code Generation Contracts
 * 
 * This file defines the function contracts (interfaces and types) for QArt generation.
 * These contracts serve as the API specification for QArt functionality.
 */

import { Segment, QRMatrix, Codeword, VersionInfo } from "../../../src/domain/shared/types";
import { QRBlock } from "../../../src/domain/qr/codewords/blocks";

/**
 * QArt Generation Options
 * 
 * Input contract for QArt QR code generation function.
 */
export interface QArtOptions {
  /** Input data segments (includes padding segments) */
  segments: Segment[];
  
  /** Data and error correction codewords */
  codewords: Codeword[];
  
  /** Reed-Solomon blocks (data + EC codewords per block) */
  blocks: QRBlock[];
  
  /** Initial QR code matrix before QArt optimization */
  initialMatrix: QRMatrix;
  
  /** QR code version information */
  versionInfo: VersionInfo;
  
  /** Error correction level (0-3) */
  errorCorrectionLevel: number;
  
  /** Target image to embed in QR code */
  targetImage: ImageData;
  
  /** Minimum decode success rate (default: 0.8) */
  minDecodeRedundancy?: number;
  
  /** Number of decode trials for verification (default: 1) */
  decodeTrials?: number;
  
  /** Optional: AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * QArt Generation Result
 * 
 * Output contract for QArt QR code generation function.
 */
export interface QArtResult {
  /** Optimized QR code matrix */
  matrix: QRMatrix;
  
  /** Data mask pattern used (always 0 for QArt) */
  dataMask: number;
  
  /** Segments (may include QArt-added segments) */
  segments: Segment[];
  
  /** Visual error between target image and QR code (0-1, lower is better) */
  error: number;
  
  /** Decode verification success rate (0-1) */
  decodeSuccessRate: number;
  
  /** Number of optimization iterations (legacy; always 1 — omitted from QArtResult) */
  iterations?: number;
  
  /** Optional: Visualization matrix showing controlled modules */
  controlMatrix?: QRMatrix;
}

/**
 * QArt Generation Function Contract
 * 
 * Generates a QArt QR code that embeds a target image while maintaining scannability.
 * 
 * @param options - QArt generation options
 * @returns Promise resolving to QArt generation result
 * @throws Error if generation fails or scannability verification fails
 * 
 * Performance Requirements:
 * - Version 1-10: < 5 seconds (SC-001)
 * - Version 11-20: < 30 seconds (SC-002)
 * - Must respect AbortSignal for cancellation (FR-021)
 */
export type GenerateQArtFunction = (options: QArtOptions) => Promise<QArtResult>;

/**
 * Version Capacity Check Result
 */
export interface VersionCapacityCheckResult {
  /** Whether version has sufficient capacity for QArt */
  hasCapacity: boolean;
  
  /** Available capacity in bits (version capacity - user input bits) */
  availableCapacity: number;
  
  /** Required additional capacity for QArt (calculated dynamically) */
  qartRequirement: number;
  
  /** Warning message if capacity is insufficient (null if sufficient) */
  warning: string | null;
}

/**
 * Version Capacity Check Function Contract
 * 
 * Checks if selected QR version has sufficient capacity for QArt generation.
 * 
 * @param versionInfo - QR code version information
 * @param userInputBits - Total bits from user inputs
 * @param targetImage - Target image for complexity calculation
 * @returns Capacity check result
 * 
 * Performance Requirements:
 * - Must complete within 50ms (SC-007)
 */
export type CheckVersionCapacityFunction = (
  versionInfo: VersionInfo,
  userInputBits: number,
  targetImage: ImageData
) => VersionCapacityCheckResult;

/**
 * Image Complexity Calculation Function Contract
 * 
 * Calculates image complexity score for capacity requirement estimation.
 * 
 * @param imageData - Target image data
 * @param qrDimension - QR code dimension
 * @returns Complexity score (0-1, higher = more complex)
 */
export type CalculateImageComplexityFunction = (
  imageData: ImageData,
  qrDimension: number
) => number;

/**
 * QArt Capacity Requirement Calculation Function Contract
 * 
 * Calculates additional capacity requirement for QArt generation based on
 * image complexity and QR code size.
 * 
 * @param imageComplexity - Image complexity score (0-1)
 * @param qrSize - QR code version (1-40)
 * @param userInputBits - Total bits from user inputs
 * @returns Required additional capacity in bits
 */
export type CalculateQArtCapacityRequirementFunction = (
  imageComplexity: number,
  qrSize: number,
  userInputBits: number
) => number;
