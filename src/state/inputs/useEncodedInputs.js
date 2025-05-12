import { useMemo } from "react";
import { useInputs } from "./InputContext";
import { parseAll, encodeAll } from "../../domain/encoding";

export function useParsedInputs() {
  const {inputs} = useInputs();
  return useMemo(() => parseAll(inputs), [inputs]);
}