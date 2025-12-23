import { useCallback } from "react";
import { useQRDataDispatch } from "@/state/qr/QRDataContext";

/**
 * Shared hook for handling module hover events
 * Highlights modules on hover and clears on mouse leave
 */
export function useModuleHover() {
  const { highlightModules, clearHighlightedModules } = useQRDataDispatch();

  const handleModuleHover = useCallback((module) => {
    if (module?.bit?.id) {
      highlightModules([module.bit.id]);
    } else if (module === null) {
      clearHighlightedModules([]);
    }
  }, [highlightModules, clearHighlightedModules]);

  return handleModuleHover;
}

