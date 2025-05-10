import { useEffect, useState } from "react";
import { useInputs } from "./InputContext";
import { parseAll } from "../../domain/encoding";

export function useEncodedInputs() {
  const inputs = useInputs();
  const [encoded, setEncoded] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function runEncoding() {
      const result = await parseAll(inputs);
      if (!cancelled) setEncoded(result);
    }

    runEncoding();
    return () => { cancelled = true };
  }, [inputs]);

  return encoded;
}

export function useEncodedSegments() {
  
}