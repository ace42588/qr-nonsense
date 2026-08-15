import { useMemo } from "react";
import { collectParseErrors, parseAll } from "@/domain/input";
import { useInputs } from "@/state/inputs/InputContext";
import { Input } from "@/state/inputs/types";

type ParsedInputs = Record<string, Input>;

export interface ParsedInputsResult {
  parsed: ParsedInputs;
  errors: Record<string, string>;
}

/**
 * CRITICAL: This hook MUST be memoized to prevent segments from being recreated.
 * 
 * If parseAll is called on every render, it returns a new object reference,
 * which causes getEncodedMessage to recompute, creating new segments with new bit IDs.
 * This breaks highlighting because segment.bitIds won't match the matrix bit.id values.
 * 
 * By memoizing, we ensure segments remain stable unless inputs actually change.
 */
export function useParsedInputs(): ParsedInputsResult {
  const { inputs } = useInputs();
  return useMemo(() => {
    const parsed = parseAll(inputs) as ParsedInputs;
    return { parsed, errors: collectParseErrors(parsed) as Record<string, string> };
  }, [inputs]);
}
