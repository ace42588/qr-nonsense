import { useMemo } from "react";
import { useInputs } from "./InputContext";
import { parseAll } from "../../domain";

export function useParsedInputs() {
  const {inputs} = useInputs();
  return useMemo(() => parseAll(inputs), [inputs]);
}