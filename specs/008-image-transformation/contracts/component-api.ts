/**
 * Component API Contracts for Image Transformation UI Components
 * 
 * This file defines the props and behavior contracts for image transformation-related React components.
 */

/**
 * ImageUploadControls Component Props
 * 
 * Component for uploading images from files or URLs.
 */
export interface ImageUploadControlsProps {
  /** File input ref for programmatic access */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  /** Current image URL (for URL input) */
  imageUrl: string | null;
  
  /** Callback when image URL changes (for URL input) */
  onImageUrlChange: (url: string) => void;
  
  /** Callback when file is uploaded */
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  /** Whether controls are disabled */
  disabled?: boolean;
}

/**
 * ImageUploadControls Component Behavior Contract
 * 
 * Component MUST:
 * - Provide file input for local file selection (FR-001)
 * - Provide URL input for remote image loading (FR-003)
 * - Accept common image formats (JPEG, PNG, GIF, WebP) (FR-002)
 * - Display loading state during upload/load (FR-006)
 * - Display error messages for failed operations (FR-007)
 * - Validate file size before processing (FR-024)
 * - Validate file type before processing (FR-002)
 * - Cancel previous operation when new upload/load starts (FR-021)
 * 
 * Performance Requirements:
 * - File size validation completes synchronously (<1ms)
 * - Error messages displayed within 200ms of failure (SC-006)
 * - Loading states accurately reflect progress (SC-007)
 */
export interface ImageUploadControlsComponentContract {
  props: ImageUploadControlsProps;
  behavior: {
    fileUpload: {
      validation: {
        fileSize: "10MB limit";
        fileType: ["image/jpeg", "image/png", "image/gif", "image/webp"];
        timing: "before FileReader processing";
      };
      errorHandling: {
        fileSizeExceeded: "Reject with error message";
        invalidFileType: "Reject with error message";
        fileReadError: "Show error message";
      };
    };
    urlLoad: {
      validation: {
        urlFormat: "HTTP/HTTPS URL validation";
        timing: "before image load";
      };
      errorHandling: {
        invalidUrl: "Show error message";
        corsError: "Show CORS-specific error message";
        networkError: "Show network error message";
        timeout: "Show timeout error message";
      };
      cancellation: "AbortController pattern";
    };
    concurrentOperations: {
      cancellation: "Cancel previous operation immediately when new starts";
      fileUpload: "Ignore FileReader result if new upload started";
      urlLoad: "Abort fetch if new load started";
    };
  };
}

/**
 * ImageTransformControls Component Props
 * 
 * Component for controlling image transformation (scale, position).
 */
export interface ImageTransformControlsProps {
  /** Current scale value */
  scale: number;
  
  /** Current horizontal offset */
  offsetX: number;
  
  /** Current vertical offset */
  offsetY: number;
  
  /** Current canvas size */
  canvasSize: number;
  
  /** Callback when scale changes */
  onScaleChange: (scale: number) => void;
  
  /** Callback when offsetX changes */
  onOffsetXChange: (offsetX: number) => void;
  
  /** Callback when offsetY changes */
  onOffsetYChange: (offsetY: number) => void;
  
  /** Callback when canvas size changes */
  onCanvasSizeChange?: (size: number) => void;
  
  /** Whether controls are disabled */
  disabled?: boolean;
}

/**
 * ImageTransformControls Component Behavior Contract
 * 
 * Component MUST:
 * - Provide slider for scale adjustment (FR-011)
 * - Provide slider for position X adjustment (FR-009)
 * - Provide slider for position Y adjustment (FR-009)
 * - Update preview in real-time as transformations are applied (FR-013)
 * - Allow positioning images anywhere (offsetX/offsetY can move image outside visible canvas) (FR-019)
 * - Clip image to canvas bounds during rendering (FR-020)
 * - Preserve aspect ratio during scaling (FR-018)
 * 
 * Performance Requirements:
 * - Preview updates within 100ms of parameter changes (SC-003)
 * - Transformations can be applied without performance degradation (SC-008)
 */
export interface ImageTransformControlsComponentContract {
  props: ImageTransformControlsProps;
  behavior: {
    scale: {
      range: "0.1 to 3.0";
      step: "0.01";
      default: "Auto-calculated based on image dimensions";
      validation: "Clamped to 0.1-3.0, must be finite and positive";
    };
    offsetX: {
      range: "-canvasSize/2 to canvasSize/2";
      default: "0 (centered)";
      validation: "Can be any finite number (clipping handled during rendering)";
    };
    offsetY: {
      range: "-canvasSize/2 to canvasSize/2";
      default: "0 (centered)";
      validation: "Can be any finite number (clipping handled during rendering)";
    };
    preview: {
      updateTiming: "100ms after parameter change";
      realTime: true;
    };
  };
}

/**
 * ImageTransformContext Value Contract
 * 
 * Context value provided by ImageTransformProvider.
 */
export interface ImageTransformContextValue {
  /** Current scale factor */
  scale: number;
  
  /** Current horizontal offset */
  offsetX: number;
  
  /** Current vertical offset */
  offsetY: number;
  
  /** Current image URL */
  imageUrl: string | null;
  
  /** Transformed image data */
  transformedImageData: ImageData | null;
  
  /** Canvas size */
  canvasSize: number;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error message */
  error: string | null;
  
  /** Set scale function */
  setScale: (scale: number) => void;
  
  /** Set offsetX function */
  setOffsetX: (offsetX: number) => void;
  
  /** Set offsetY function */
  setOffsetY: (offsetY: number) => void;
  
  /** Set image URL function */
  setImageUrl: (imageUrl: string | null) => void;
  
  /** Set canvas size function */
  setCanvasSize: (canvasSize: number) => void;
  
  /** File input ref */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  /** Image upload handler */
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * ImageTransformContext Behavior Contract
 * 
 * Context MUST:
 * - Manage image transformation state (FR-008, FR-009, FR-010)
 * - Handle image upload from local files (FR-001)
 * - Handle image loading from URLs (FR-003)
 * - Validate file size before processing (FR-024)
 * - Validate image dimensions after loading (FR-025)
 * - Auto-calculate scale when new image loaded (FR-010)
 * - Transform image to ImageData format (FR-015)
 * - Convert transparency to white background (FR-022)
 * - Cancel in-progress operations when new operation starts (FR-021)
 * - Display loading state during operations (FR-006)
 * - Display error messages for failed operations (FR-007)
 * - Update transformed image data when parameters change (FR-013)
 * 
 * Performance Requirements:
 * - Image upload completes within 2 seconds for images up to 10MB (SC-001)
 * - Image URL loading completes within 5 seconds (SC-002)
 * - Transformation preview updates within 100ms (SC-003)
 * - Image conversion completes within 500ms for images up to 2048x2048 (SC-004)
 * - Error messages displayed within 200ms (SC-006)
 */
export interface ImageTransformContextContract {
  value: ImageTransformContextValue;
  behavior: {
    stateManagement: {
      autoCalculateScale: "On new image load";
      resetOffsets: "On new image load";
      preserveTransform: "On parameter change (not on new image)";
    };
    validation: {
      fileSize: "Before FileReader processing, reject if >10MB";
      fileType: "Before FileReader processing, reject if not image/*";
      dimensions: "After image load, auto-scale if >4096x4096";
    };
    transformation: {
      triggers: ["imageUrl change", "scale change", "offsetX change", "offsetY change", "canvasSize change"];
      transparency: "Convert to white background";
      clipping: "Clip to canvas bounds";
    };
    errorHandling: {
      noRetry: "User must manually re-attempt (FR-023)";
      errorTypes: ["fileSizeExceeded", "invalidFileType", "fileReadError", "invalidUrl", "corsError", "networkError", "dimensionScalingFailed", "transformationFailed"];
    };
    cancellation: {
      fileUpload: "Track via ref, ignore FileReader result if new upload started";
      urlLoad: "AbortController pattern";
      transformation: "isMounted flag pattern";
    };
  };
}

