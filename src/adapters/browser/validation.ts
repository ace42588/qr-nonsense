/**
 * Browser-based QR code validation adapter
 * Uses browser APIs (canvas, jsQR) to validate QR code scannability
 */

import jsQR from "jsqr";
import { QRMatrix } from "@/domain/shared/types";

/**
 * Deterministic pseudo-random number generator for consistent perturbations
 * Uses a simple linear congruential generator seeded by trial index
 */
function deterministicRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Validate QR code can be decoded with light perturbations using jsQR
 * 
 * This function:
 * 1. Renders the QR matrix to a canvas
 * 2. Applies perturbations (scale variations, slight blur, rotation)
 * 3. Attempts decode with jsQR
 * 4. Returns success rate
 * 
 * @param matrix - The QR code matrix to validate
 * @param trials - Number of decode attempts. If 1, no perturbations are applied.
 * @param debug - If true, logs canvas previews and diagnostic information
 * @returns Success rate (0.0 to 1.0) of successful decodes
 */
export async function validateDecode(
  matrix: QRMatrix,
  trials: number,
  debug: boolean = false
): Promise<number> {
  if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
    return 0;
  }
  
  const dimension = matrix.length;
  
  // Basic structure validation
  if (matrix.some(row => !row || row.length !== dimension)) {
    return 0;
  }
  
  // Render matrix to canvas with quiet zone
  // QR codes require a quiet zone (white border) of at least 4 modules on all sides
  const quietZone = 4;
  const totalDimension = dimension + quietZone * 2;
  const canvas = document.createElement("canvas");
  const size = 400; // Render at high resolution for better decode
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  
  // Disable image smoothing for crisp QR code rendering
  ctx.imageSmoothingEnabled = false;
  
  // Draw white background (including quiet zone)
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, size, size);
  
  // Draw modules (with quiet zone offset)
  // Use integer pixel positions for crisp rendering
  const moduleSize = size / totalDimension;
  for (let y = 0; y < dimension; y++) {
    for (let x = 0; x < dimension; x++) {
      const module = matrix[y]?.[x];
      if (!module) continue;
      
      // Round to nearest pixel for crisp edges
      const moduleX = Math.round((x + quietZone) * moduleSize);
      const moduleY = Math.round((y + quietZone) * moduleSize);
      const moduleWidth = Math.round((x + quietZone + 1) * moduleSize) - moduleX;
      const moduleHeight = Math.round((y + quietZone + 1) * moduleSize) - moduleY;
      
      ctx.fillStyle = module.isDark ? "black" : "white";
      ctx.fillRect(moduleX, moduleY, moduleWidth, moduleHeight);
    }
  }
  
  let successCount = 0;
  const usePerturbations = trials > 1;
  
  for (let trial = 0; trial < trials; trial++) {
    // Create a temporary canvas for this trial
    const trialCanvas = document.createElement("canvas");
    trialCanvas.width = size;
    trialCanvas.height = size;
    const trialCtx = trialCanvas.getContext("2d");
    if (!trialCtx) continue;
    
    // Disable image smoothing for crisp rendering
    trialCtx.imageSmoothingEnabled = false;
    
    // Ensure white background for trial canvas
    trialCtx.fillStyle = "white";
    trialCtx.fillRect(0, 0, size, size);
    
    let scale: number | undefined;
    let rotation: number | undefined;
    let blur: number | undefined;
    
    if (usePerturbations) {
      // Use deterministic perturbations based on trial index
      const rand = deterministicRandom(trial);
      scale = 0.9 + rand() * 0.2; // 0.9 to 1.1
      rotation = (rand() - 0.5) * 0.1; // ±0.05 radians (~±3 degrees)
      blur = rand() < 0.3 ? 0.5 : 0; // 30% chance of slight blur
      
      trialCtx.save();
      
      // Center and apply transformations
      trialCtx.translate(size / 2, size / 2);
      trialCtx.rotate(rotation);
      trialCtx.scale(scale, scale);
      trialCtx.translate(-size / 2, -size / 2);
      
      // Draw with optional blur
      if (blur > 0) {
        trialCtx.filter = `blur(${blur}px)`;
      }
      trialCtx.drawImage(canvas, 0, 0);
      
      trialCtx.restore();
    } else {
      // No perturbations - direct copy
      trialCtx.drawImage(canvas, 0, 0);
    }
    
    // Get image data
    const imageData = trialCtx.getImageData(0, 0, size, size);
    
    // Debug: Log trial canvas preview
    if (debug) {
      if (usePerturbations && scale !== undefined && rotation !== undefined && blur !== undefined) {
        console.log(`[validateDecode] Trial ${trial} perturbations: scale=${scale.toFixed(3)}, rotation=${rotation.toFixed(4)}rad, blur=${blur}`);
      } else {
        console.log(`[validateDecode] Trial ${trial}: No perturbations applied`);
      }
    }
    
    // Attempt decode with jsQR
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (debug) {
        console.log(`[validateDecode] Trial ${trial} decode result:`, code ? "SUCCESS" : "FAILED");
        if (code) {
          console.log(`[validateDecode] Decoded data length: ${code.data?.length || 0}`);
        }
      }
      
      if (code && code.data) {
        successCount++;
      }
    } catch (error) {
      // Decode failed
      if (debug) {
        console.log(`[validateDecode] Trial ${trial} decode error:`, error);
      }
      continue;
    }
  }
  
  if (debug) {
    console.log(`[validateDecode] Final success rate: ${successCount}/${trials} = ${(successCount / trials).toFixed(2)}`);
  }
  
  return successCount / trials;
}

