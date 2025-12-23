/**
 * Component API Contracts for QArt UI Components
 * 
 * This file defines the props and behavior contracts for QArt-related React components.
 */

import { QArtResult } from "./qart-generation";

/**
 * QRQArt Component Props
 * 
 * Main QArt QR code generation component.
 */
export interface QRQArtProps {
  /** Initial canvas size in pixels (default: 480) */
  size?: number;
}

/**
 * QRQArt Component Behavior Contract
 * 
 * Component MUST:
 * - Display QArt QR code when image is loaded and inputs are available
 * - Show loading state during generation (FR-022)
 * - Display error messages when generation fails (FR-023)
 * - Require target image before generation (FR-002)
 * - Regenerate when inputs change (FR-018)
 * - Regenerate when target image changes (FR-019)
 * - Regenerate when QArt parameters change (FR-020)
 * - Cancel current generation when inputs change during generation
 * - Debounce rapid parameter changes (max 1 per 300ms) (FR-024)
 * - Display control matrix visualization when enabled (FR-012)
 * - Display warnings for insufficient version capacity (FR-015)
 * - Display warnings for extreme image scaling (FR-027)
 * 
 * Performance Requirements:
 * - Error messages displayed within 200ms of failure (SC-011)
 * - Warning messages displayed within 200ms (SC-012)
 * - Loading states accurately reflect progress (SC-013)
 * - Control matrix visualization renders within 500ms (SC-014)
 */
export interface QRQArtComponentContract {
  props: QRQArtProps;
  behavior: {
    generation: {
      triggers: ["imageLoaded", "inputsChanged", "parametersChanged"];
      cancellation: "onInputChange";
      debouncing: "300ms";
    };
    errorHandling: {
      displayTime: "200ms";
      errorTypes: ["noImage", "noSegments", "generationFailed", "scannabilityFailed"];
    };
    warnings: {
      displayTime: "200ms";
      warningTypes: ["insufficientCapacity", "extremeScaling"];
    };
  };
}

/**
 * Image Transform Controls Component Props
 * 
 * Component for controlling image transformation (scale, position, etc.).
 */
export interface ImageTransformControlsProps {
  /** Current canvas size */
  canvasSize: number;
  
  /** Callback when canvas size changes */
  onCanvasSizeChange: (size: number) => void;
  
  /** Whether controls are enabled */
  disabled?: boolean;
}

/**
 * Image Transform Controls Component Behavior Contract
 * 
 * Component MUST:
 * - Allow user to adjust canvas size
 * - Update image transform state
 * - Trigger QArt regeneration when transform changes
 * - Debounce rapid changes to avoid excessive regeneration
 */
export interface ImageTransformControlsComponentContract {
  props: ImageTransformControlsProps;
  behavior: {
    updates: {
      debounce: "300ms";
      triggersRegeneration: true;
    };
  };
}

/**
 * Message Banner Component Props
 * 
 * Generic component for displaying messages (errors, warnings, loading).
 */
export interface MessageBannerProps {
  /** Message type */
  type: "error" | "warning" | "loading";
  
  /** Message text */
  message: string;
  
  /** Whether banner is visible */
  visible: boolean;
}

/**
 * Message Banner Component Behavior Contract
 * 
 * Component MUST:
 * - Display error messages (red styling)
 * - Display warning messages (yellow/orange styling)
 * - Display loading messages (with spinner/indicator)
 * - Animate appearance/disappearance
 * - Be accessible (ARIA labels)
 */
export interface MessageBannerComponentContract {
  props: MessageBannerProps;
  behavior: {
    styling: {
      error: "red";
      warning: "yellow/orange";
      loading: "blue with spinner";
    };
    accessibility: {
      ariaLabels: true;
      role: "alert" | "status";
    };
  };
}

