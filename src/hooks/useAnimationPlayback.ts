import { useEffect, useMemo, useRef, useState } from "react";

interface UseAnimationPlaybackParams {
  delaysMs: number[];
  enabled: boolean;
  paused?: boolean;
}

interface UseAnimationPlaybackReturn {
  frameIndex: number;
}

/**
 * Delay-based GIF playback clock. Pauses while `paused` is true and resets
 * when the delay list or enabled flag changes.
 */
export function useAnimationPlayback({
  delaysMs,
  enabled,
  paused = false,
}: UseAnimationPlaybackParams): UseAnimationPlaybackReturn {
  const [frameIndex, setFrameIndex] = useState(0);
  const indexRef = useRef(0);
  const delaysRef = useRef(delaysMs);
  delaysRef.current = delaysMs;
  const delayKey = useMemo(() => delaysMs.join(","), [delaysMs]);

  useEffect(() => {
    indexRef.current = 0;
    setFrameIndex(0);
  }, [delayKey, enabled]);

  useEffect(() => {
    if (!enabled || paused || delaysRef.current.length <= 1) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      if (cancelled) return;
      const delays = delaysRef.current;
      const delay = delays[indexRef.current] ?? 100;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const next = (indexRef.current + 1) % delaysRef.current.length;
        indexRef.current = next;
        setFrameIndex(next);
        tick();
      }, Math.max(1, delay));
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [delayKey, enabled, paused]);

  if (!enabled || delaysMs.length <= 1) {
    return { frameIndex: 0 };
  }
  return { frameIndex };
}
