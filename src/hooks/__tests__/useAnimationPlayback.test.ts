import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnimationPlayback } from "@/hooks/useAnimationPlayback";

describe("useAnimationPlayback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays on frame 0 when disabled", () => {
    const { result } = renderHook(() =>
      useAnimationPlayback({ delaysMs: [50, 50], enabled: false })
    );
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.frameIndex).toBe(0);
  });

  it("advances through delays and loops", () => {
    const delaysMs = [40, 60];
    const { result } = renderHook(() =>
      useAnimationPlayback({ delaysMs, enabled: true })
    );
    expect(result.current.frameIndex).toBe(0);
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    expect(result.current.frameIndex).toBe(1);
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    expect(result.current.frameIndex).toBe(0);
  });

  it("does not advance while paused", () => {
    const delaysMs = [30, 30];
    const { result, rerender } = renderHook(
      ({ paused }) =>
        useAnimationPlayback({ delaysMs, enabled: true, paused }),
      { initialProps: { paused: true } }
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.frameIndex).toBe(0);
    rerender({ paused: false });
    act(() => {
      vi.advanceTimersToNextTimer();
    });
    expect(result.current.frameIndex).toBe(1);
  });
});
