import { useEffect, useState } from "react";
import { useInputs } from "./InputContext";
import { encodeAll } from "../../domain/encoding";

export function useEncodedInputs() {
  const inputs = useInputs();
  const [encoded, setEncoded] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function runEncoding() {
      const result = await encodeAll(inputs);
      if (!cancelled) setEncoded(result);
    }

    runEncoding();
    return () => { cancelled = true };
  }, [inputs]);

  return encoded;
}