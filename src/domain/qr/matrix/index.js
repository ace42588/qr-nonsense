import { createMatrix, addCodewords, applyMask, attachModuleIndex } from "./utils";
import { calculatePenalty } from "./calculatePenalty";
import { addPatterns, updateFormatInfoModules, addVersionInfo } from "./modules";

/**
 * Generates a complete QR code matrix with all patterns, codewords, and format information.
 * 
 * This function creates the final QR code matrix by:
 * 1. Creating an empty matrix of the appropriate size
 * 2. Adding finder patterns, alignment patterns, timing patterns, and separators
 * 3. Placing data and error correction codewords
 * 4. Applying the data mask (or selecting the optimal mask automatically)
 * 5. Adding format information modules
 * 
 * @param {Array} codewords - Array of codeword objects containing data and error correction codewords
 * @param {number|string} dataMask - Data mask index (0-7) or -1 for automatic selection
 * @param {number} version - QR code version (1-40)
 * @param {number} errorCorrectionLevel - Error correction level (0=L, 1=M, 2=Q, 3=H)
 * @returns {Object} Matrix generation result containing:
 *   - matrix: {Array<Array>} 2D array representing the QR code matrix
 *   - dataMask: {number} The mask index used (0-7)
 */
export function getMatrix(codewords, dataMask, version, errorCorrectionLevel) {
  // Pre-compute base matrix with patterns once (doesn't depend on mask)
  const matrix = createMatrix(version);
  const base = addPatterns(matrix);
  
  // Pre-compute populated matrix with codewords once (doesn't depend on mask)
  // This avoids recomputing addCodewords for each mask evaluation
  const populated = addCodewords(base, codewords);

  if (parseInt(dataMask) !== -1) {
    // Specific mask requested - apply it directly
    const masked = applyMask(populated, dataMask);
    // CRITICAL: Must use masked matrix, not the original empty matrix!
    // updateFormatInfoModules only updates format info positions, but using the wrong
    // matrix would lose all the data modules we just added.
    const final = updateFormatInfoModules(
      masked,
      errorCorrectionLevel,
      dataMask
    );
    // Add version info AFTER masking (QR spec requirement for versions >= 7)
    addVersionInfo(final);
    // Attach getModuleByBitId method to the matrix
    attachModuleIndex(final);
    return { matrix: final, dataMask };
  }

  // Automatic mask scoring
  // Optimized: Only create masked matrices and format info updates during evaluation
  // The populated matrix is already computed above and reused for all masks
  let bestScore = Infinity;
  let bestMask = 0;
  let bestMatrix;
  for (let maskIdx = 0; maskIdx < 8; maskIdx++) {
    // Apply mask to pre-computed populated matrix
    const masked = applyMask(populated, maskIdx);
    // CRITICAL: Must use masked matrix, not the original empty matrix!
    const testMatrix = updateFormatInfoModules(
      masked,
      errorCorrectionLevel,
      maskIdx
    );
    const score = calculatePenalty(testMatrix);
    // Select mask based on score
    if (score < bestScore) {
      bestScore = score;
      bestMask = maskIdx;
      bestMatrix = testMatrix;
    }
  }
  // Use the bestMatrix we already computed instead of recomputing
  // This ensures we use the exact same matrix that was scored
  let final = bestMatrix || updateFormatInfoModules(
    applyMask(populated, bestMask),
    errorCorrectionLevel,
    bestMask
  );

  // Add version info AFTER masking (QR spec requirement for versions >= 7)
  addVersionInfo(final);

  // Attach getModuleByBitId method to the matrix
  attachModuleIndex(final);

  return { matrix: final, dataMask: bestMask };
}
