import { useMemo } from "react";
import { useInputs } from "./InputContext";
import { parseAll, encodeAll } from "../../domain/encoding";

export function useEncodedInputs() {
  const inputs = useInputs();
  return useMemo(() => encodeAll(inputs), [inputs]);
}