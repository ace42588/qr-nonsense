/**
 * QArt Capacity Calculation
 * 
 * Functions for calculating QArt capacity requirements and checking version capacity.
 */

import { VersionInfo, getVersionInfo } from "@/domain/qr/versionUtils";
import { calculateImageComplexity } from "@/domain/image";

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
 * Calculate QArt capacity requirement based on image complexity, QR size, and user input
 * 
 * Formula:
 * - Base: 50% of user input bits
 * - Complexity factor: 0.1-0.3 multiplier based on complexity score
 * - Size factor: 1.0 for versions 1-10, 1.2 for versions 11-20, 1.5 for versions 21+
 * 
 * @param imageComplexity - Image complexity score (0-1)
 * @param qrSize - QR code version (1-40)
 * @param userInputBits - Total bits from user inputs
 * @returns Required additional capacity in bits
 */
export function calculateQArtCapacityRequirement(
  imageComplexity: number,
  qrSize: number,
  userInputBits: number
): number {
  // Validate inputs
  if (!isFinite(imageComplexity) || imageComplexity < 0 || imageComplexity > 1) {
    imageComplexity = 0.5; // Default to medium complexity
  }
  
  if (!isFinite(qrSize) || qrSize < 1 || qrSize > 40) {
    throw new Error("Invalid QR size: must be between 1 and 40");
  }
  
  if (!isFinite(userInputBits) || userInputBits < 0) {
    throw new Error("Invalid user input bits: must be non-negative");
  }
  
  // Base capacity: 50% of user input
  const baseCapacity = userInputBits * 0.5;
  
  // Complexity factor: 0.1-0.3 multiplier
  // Map complexity (0-1) to factor (0.1-0.3)
  const complexityFactor = 0.1 + (imageComplexity * 0.2);
  
  // Size factor based on QR version
  let sizeFactor: number;
  if (qrSize <= 10) {
    sizeFactor = 1.0;
  } else if (qrSize <= 20) {
    sizeFactor = 1.2;
  } else {
    sizeFactor = 1.5;
  }
  
  // Calculate requirement
  const requirement = baseCapacity + (baseCapacity * complexityFactor * sizeFactor);
  
  return Math.ceil(requirement);
}

/**
 * Find the minimum QR version with sufficient capacity for QArt generation
 * 
 * @param userInputBits - Total bits from user inputs
 * @param targetImage - Target image for complexity calculation
 * @param errorCorrectionLevel - Error correction level (0-3)
 * @returns VersionInfo for the minimum version with sufficient capacity, or null if none found
 */
export function findMinimumQArtVersion(
  userInputBits: number,
  targetImage: ImageData,
  errorCorrectionLevel: number
): VersionInfo | null {
  // Validate inputs
  if (!isFinite(userInputBits) || userInputBits < 0) {
    return null;
  }
  
  if (!targetImage || !targetImage.width || !targetImage.height) {
    return null;
  }
  
  if (!isFinite(errorCorrectionLevel) || errorCorrectionLevel < 0 || errorCorrectionLevel > 3) {
    return null;
  }
  
  // Try each version until one is found that has sufficient capacity
  for (let version = 1; version <= 40; version++) {
    const versionInfo = getVersionInfo(errorCorrectionLevel, version);
    
    // Calculate available capacity
    const availableCapacity = versionInfo.capacity - userInputBits;
    
    // If no available capacity, skip this version
    if (availableCapacity <= 0) {
      continue;
    }
    
    // Calculate QArt requirement for this version
    const qrDimension = version * 4 + 17;
    const imageComplexity = calculateImageComplexity(targetImage, qrDimension);
    const qartRequirement = calculateQArtCapacityRequirement(
      imageComplexity,
      version,
      userInputBits
    );
    
    // Check if capacity is sufficient
    if (availableCapacity >= qartRequirement) {
      return versionInfo;
    }
  }
  
  // No version found with sufficient capacity
  return null;
}

/**
 * Check if QR version has sufficient capacity for QArt generation
 * 
 * @param versionInfo - QR code version information
 * @param userInputBits - Total bits from user inputs
 * @param targetImage - Target image for complexity calculation
 * @returns Capacity check result with warning message if insufficient
 */
export function checkVersionCapacityForQArt(
  versionInfo: VersionInfo,
  userInputBits: number,
  targetImage: ImageData
): VersionCapacityCheckResult {
  // Validate inputs
  if (!versionInfo || !isFinite(versionInfo.capacity) || versionInfo.capacity < 0) {
    return {
      hasCapacity: false,
      availableCapacity: 0,
      qartRequirement: 0,
      warning: "Invalid version information",
    };
  }
  
  if (!isFinite(userInputBits) || userInputBits < 0) {
    return {
      hasCapacity: false,
      availableCapacity: 0,
      qartRequirement: 0,
      warning: "Invalid user input bits",
    };
  }
  
  if (!targetImage || !targetImage.width || !targetImage.height) {
    return {
      hasCapacity: false,
      availableCapacity: 0,
      qartRequirement: 0,
      warning: "Invalid target image",
    };
  }
  
  // Calculate available capacity
  const availableCapacity = versionInfo.capacity - userInputBits;
  
  // Calculate QArt requirement
  const qrDimension = versionInfo.version * 4 + 17;
  const imageComplexity = calculateImageComplexity(targetImage, qrDimension);
  const qartRequirement = calculateQArtCapacityRequirement(
    imageComplexity,
    versionInfo.version,
    userInputBits
  );
  
  // Check if capacity is sufficient
  // Note: If availableCapacity <= 0 (including exactly minimum capacity), treat as insufficient
  const hasCapacity = availableCapacity > 0 && availableCapacity >= qartRequirement;
  
  // Generate warning message if insufficient
  let warning: string | null = null;
  if (!hasCapacity) {
    if (availableCapacity <= 0) {
      warning = `Selected QR version has insufficient capacity for QArt generation. Version ${versionInfo.version} has ${versionInfo.capacity} bits capacity, but ${userInputBits} bits are already used.`;
    } else {
      warning = `Selected QR version has insufficient capacity for QArt generation. Available: ${availableCapacity} bits, Required: ${qartRequirement} bits.`;
    }
  }
  
  return {
    hasCapacity,
    availableCapacity,
    qartRequirement,
    warning,
  };
}

