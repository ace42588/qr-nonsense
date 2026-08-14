import { useMemo } from "react";
import { parseAll } from "@/domain/input";
import { useInputs } from "@/state/inputs/InputContext";
import { Input } from "@/state/inputs/types";

type ParsedInputs = Record<string, Input>;

/**
 * CRITICAL: This hook MUST be memoized to prevent segments from being recreated.
 * 
 * If parseAll is called on every render, it returns a new object reference,
 * which causes getEncodedMessage to recompute, creating new segments with new bit IDs.
 * This breaks highlighting because segment.bitIds won't match the matrix bit.id values.
 * 
 * By memoizing, we ensure segments remain stable unless inputs actually change.
 */
export function useParsedInputs(): ParsedInputs {
  const { inputs } = useInputs();
  return useMemo(() => parseAll(inputs), [inputs]);
}
