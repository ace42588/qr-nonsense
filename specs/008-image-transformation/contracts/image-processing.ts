/**
 * Image Processing Contracts for Image Transformation
 * 
 * This file defines the function contracts for image processing operations
 * used in image upload and transformation.
 */

/**
 * Image Loading Function Contract
 * 
 * Loads an image from a URL (HTTP/HTTPS or data URL).
 * 
 * @param imageUrl - URL of the image to load (HTTP/HTTPS URL or data URL)
 * @returns Promise resolving to HTMLImageElement
 * 
 * Validation:
 * - Throws Error for invalid URLs
 * - Throws Error for CORS-restricted URLs
 * - Throws Error for non-image content types
 * - Throws Error for network failures
 * 
 * Performance Requirements:
 * - Must complete within 5 seconds for typical image sizes (SC-002)
 * - Must handle cancellation via AbortController
 * 
 * Error Handling:
 * - Network errors: "Failed to load image: network error"
 * - CORS errors: "Failed to load image: CORS restrictions"
 * - Invalid URL: "Failed to load image: invalid URL"
 * - Timeout: "Failed to load image: timeout"
 */
export type LoadImageFunction = (
  imageUrl: string,
  signal?: AbortSignal
) => Promise<HTMLImageElement>;

/**
 * File Size Validation Function Contract
 * 
 * Validates file size against maximum limit.
 * 
 * @param file - File object to validate
 * @param maxSizeBytes - Maximum file size in bytes (default: 10MB)
 * @returns Validation result with isValid flag and error message
 * 
 * Validation:
 * - File size must be <= maxSizeBytes
 * - Returns error message if exceeded
 * 
 * Performance Requirements:
 * - Must complete synchronously (<1ms)
 */
export interface FileSizeValidationResult {
  /** Whether file size is valid */
  isValid: boolean;
  
  /** Error message if invalid (null if valid) */
  error: string | null;
  
  /** File size in bytes */
  sizeBytes: number;
  
  /** Maximum allowed size in bytes */
  maxSizeBytes: number;
}

export type ValidateFileSizeFunction = (
  file: File,
  maxSizeBytes?: number
) => FileSizeValidationResult;

/**
 * Image Dimension Validation Function Contract
 * 
 * Validates image dimensions and scales down if necessary.
 * 
 * @param image - HTMLImageElement to validate
 * @param maxDimension - Maximum dimension in pixels (default: 4096)
 * @returns Validation result with isValid flag, scaled image if needed, and error message
 * 
 * Validation:
 * - If max(width, height) > maxDimension: Auto-scale down preserving aspect ratio
 * - If scaling fails: Return error
 * - If valid: Return original image
 * 
 * Performance Requirements:
 * - Must complete within 500ms for images up to 4096x4096 (SC-004)
 */
export interface DimensionValidationResult {
  /** Whether dimensions are valid (or successfully scaled) */
  isValid: boolean;
  
  /** Scaled image if scaling was needed (null if no scaling) */
  scaledImage: HTMLImageElement | null;
  
  /** Error message if validation/scaling failed (null if valid) */
  error: string | null;
  
  /** Original width */
  originalWidth: number;
  
  /** Original height */
  originalHeight: number;
  
  /** Scaled width (same as original if no scaling) */
  scaledWidth: number;
  
  /** Scaled height (same as original if no scaling) */
  scaledHeight: number;
}

export type ValidateImageDimensionsFunction = (
  image: HTMLImageElement,
  maxDimension?: number
) => Promise<DimensionValidationResult>;

/**
 * Image Transformation Function Contract
 * 
 * Transforms an image by applying scale and translation, producing canvas-sized ImageData.
 * 
 * @param image - Source image (HTMLImageElement, ImageData, or image URL string)
 * @param canvasSize - Target canvas size (square)
 * @param scale - Scale factor (1.0 = original size relative to canvas)
 * @param offsetX - Horizontal offset in pixels (0 = centered)
 * @param offsetY - Vertical offset in pixels (0 = centered)
 * @returns Promise resolving to transformed ImageData sized to canvasSize x canvasSize
 * 
 * Validation:
 * - Throws Error for invalid canvasSize (must be positive, finite)
 * - Clamps scale to 0.1-3.0 if out of range
 * - Clamps offsets to finite numbers (defaults to 0 if invalid)
 * - Fills canvas with white background before drawing
 * - Clips image to canvas bounds during rendering
 * - Converts transparency to white background
 * 
 * Performance Requirements:
 * - Must complete within 500ms for images up to 2048x2048 (SC-004)
 * - Preview updates within 100ms of parameter changes (SC-003)
 * 
 * Behavior:
 * - White background fill before drawing (handles transparency)
 * - Image centered by default, then offset applied
 * - Image clipped to canvas bounds (portions outside bounds not rendered)
 */
export type TransformImageToCanvasFunction = (
  image: HTMLImageElement | ImageData | string,
  canvasSize: number,
  scale?: number,
  offsetX?: number,
  offsetY?: number
) => Promise<ImageData>;

/**
 * Canvas Scale Calculation Function Contract
 * 
 * Calculates appropriate scale factor to fit an image within canvas size.
 * 
 * @param imageWidth - Width of source image in pixels
 * @param imageHeight - Height of source image in pixels
 * @param canvasSize - Target canvas size (square)
 * @param marginFactor - Factor to leave margin (default: 0.9)
 * @returns Scale factor (scale < 1 makes image smaller, scale > 1 makes image larger)
 * 
 * Validation:
 * - Returns 1.0 for invalid inputs
 * - Clamps scale to 0.1-3.0 range
 * 
 * Performance Requirements:
 * - Must complete synchronously (<1ms)
 */
export type CalculateAppropriateCanvasScaleFunction = (
  imageWidth: number,
  imageHeight: number,
  canvasSize: number,
  marginFactor?: number
) => number;

/**
 * File Type Validation Function Contract
 * 
 * Validates that a file is a supported image type.
 * 
 * @param file - File object to validate
 * @param supportedTypes - Array of supported MIME types (default: ["image/jpeg", "image/png", "image/gif", "image/webp"])
 * @returns Validation result with isValid flag and error message
 * 
 * Validation:
 * - File type must start with "image/"
 * - File type must be in supportedTypes list
 * 
 * Performance Requirements:
 * - Must complete synchronously (<1ms)
 */
export interface FileTypeValidationResult {
  /** Whether file type is valid */
  isValid: boolean;
  
  /** Error message if invalid (null if valid) */
  error: string | null;
  
  /** File MIME type */
  mimeType: string;
  
  /** Supported MIME types */
  supportedTypes: string[];
}

export type ValidateFileTypeFunction = (
  file: File,
  supportedTypes?: string[]
) => FileTypeValidationResult;

