import { useEffect, useMemo, useRef, useState } from "react";
import { advanceAnimationClock } from "@/domain/image/animationClock";

interface UseAnimationPlaybackParams {
  delaysMs: number[];
  enabled: boolean;
  paused?: boolean;
}

interface UseAnimationPlaybackReturn {
  frameIndex: number;
}

/**
 * rAF GIF playback clock with skip-if-behind. Pauses while `paused` is true
 * and resets when the delay list or enabled flag changes.
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
    let elapsed = 0;
    let last = performance.now();
    let rafId = 0;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = now - last;
      last = now;
      const next = advanceAnimationClock(
        elapsed + dt,
        delaysRef.current,
        indexRef.current
      );
      elapsed = next.elapsedMs;
      if (next.index !== indexRef.current) {
        indexRef.current = next.index;
        setFrameIndex(next.index);
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [delayKey, enabled, paused]);

  if (!enabled || delaysMs.length <= 1) {
    return { frameIndex: 0 };
  }
  return { frameIndex };
}
