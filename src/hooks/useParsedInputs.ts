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
 * Always parses Payload A (`inputs`) so useDerivedQRData / left-pane viz stay stable
 * when the Ambiguous/Embed editor is switched to Payload B.
 */
export function useParsedInputs(): ParsedInputsResult {
  const { inputs } = useInputs();
  return useMemo(() => {
    const parsed = parseAll(inputs) as ParsedInputs;
    return { parsed, errors: collectParseErrors(parsed) as Record<string, string> };
  }, [inputs]);
}

/** Parse whichever payload list is currently being edited (A or B). */
export function useActiveParsedInputs(): ParsedInputsResult {
  const { inputs, inputsB, activePayload } = useInputs();
  const list = activePayload === "b" ? inputsB : inputs;
  return useMemo(() => {
    const parsed = parseAll(list) as ParsedInputs;
    return { parsed, errors: collectParseErrors(parsed) as Record<string, string> };
  }, [list]);
}

/** Parse a specific payload list (for dual-mode encode). */
export function parseInputList(list: Input[]): ParsedInputsResult {
  const parsed = parseAll(list) as ParsedInputs;
  return { parsed, errors: collectParseErrors(parsed) as Record<string, string> };
}
