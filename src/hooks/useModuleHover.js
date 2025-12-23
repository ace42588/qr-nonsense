import { useCallback } from "react";
import { useQRDataDispatch, useQRData } from "@/state/qr/QRDataContext";
import { isPatternModule, getPatternBitIds } from "@/utils/patternUtils";

/**
 * Shared hook for handling module hover events
 * Highlights modules on hover and clears on mouse leave
 * For pattern modules, highlights all modules in the pattern
 */
export function useModuleHover() {
  const { highlightModules } = useQRDataDispatch();
  const { matrix } = useQRData();

  const handleModuleHover = useCallback((module, xIndex, yIndex) => {
    if (module === null) {
      // Clear all highlights when mouse leaves
      highlightModules([]);
      return;
    }

    // Check if this is a pattern module
    if (isPatternModule(module)) {
      // Get all bit IDs for modules in this pattern
      const patternBitIds = getPatternBitIds(matrix, module);
      if (patternBitIds.length > 0) {
        highlightModules(patternBitIds);
      } else {
        highlightModules([]);
      }
    } else if (module?.bit?.id || module?.bitId) {
      // Regular data module - highlight just this module
      const bitId = module.bit?.id || module.bitId;
      highlightModules([bitId]);
    } else {
      // Module without bit ID - clear highlights
      highlightModules([]);
    }
  }, [highlightModules, matrix]);

  return handleModuleHover;
}

