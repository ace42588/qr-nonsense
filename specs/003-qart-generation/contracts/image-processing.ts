/**
 * Image Processing Contracts for QArt
 * 
 * This file defines the function contracts for image processing operations
 * used in QArt QR code generation.
 */

/**
 * Image Scale Calculation Function Contract
 * 
 * Calculates appropriate scale factor to fit an image within QR code dimensions
 * while preserving aspect ratio.
 * 
 * @param imageWidth - Width of source image in pixels
 * @param imageHeight - Height of source image in pixels
 * @param qrDimension - QR code grid dimension
 * @param marginFactor - Factor to leave margin (default: 0.9)
 * @returns Scale factor (scale > 1 zooms in, scale < 1 zooms out)
 * 
 * Validation:
 * - Returns 1.0 for invalid inputs
 * - Clamps scale to 0.1-10.0 range
 * 
 * Performance Requirements:
 * - Must complete within 200ms for images up to 10MP (SC-005)
 */
export type CalculateImageScaleFunction = (
  imageWidth: number,
  imageHeight: number,
  qrDimension: number,
  marginFactor?: number
) => number;

/**
 * Image Rasterization Function Contract
 * 
 * Rasterizes transformed image to QR grid coordinates.
 * 
 * @param transformedImageData - Pre-transformed ImageData (canvas-sized)
 * @param qrDimension - QR code grid dimension
 * @returns Float32Array of brightness values (0-1) for each QR module
 * 
 * Validation:
 * - Throws Error for invalid qrDimension or ImageData
 * - Returns array of size qrDimension * qrDimension
 * 
 * Performance Requirements:
 * - Must complete within 100ms for QR codes up to version 20 (SC-006)
 */
export type RasterizeImageToQRGridFunction = (
  transformedImageData: ImageData,
  qrDimension: number
) => Float32Array;

/**
 * Transparency Conversion Function Contract
 * 
 * Converts transparent areas in images with alpha channels to white background.
 * 
 * @param imageData - ImageData with potential alpha channel
 * @returns ImageData with transparent areas converted to white
 * 
 * Validation:
 * - Handles images with or without alpha channel
 * - Preserves non-transparent pixels
 */
export type ConvertTransparencyToWhiteFunction = (
  imageData: ImageData
) => ImageData;

/**
 * Extreme Scaling Detection Function Contract
 * 
 * Detects if image requires extreme scaling (potential quality issues).
 * 
 * @param scaleFactor - Calculated scale factor
 * @returns Object with isExtreme flag and warning message
 */
export interface ExtremeScalingResult {
  /** Whether scaling is extreme (> 10x or < 0.1x) */
  isExtreme: boolean;
  
  /** Warning message if extreme (null if not extreme) */
  warning: string | null;
}

export type DetectExtremeScalingFunction = (
  scaleFactor: number
) => ExtremeScalingResult;

