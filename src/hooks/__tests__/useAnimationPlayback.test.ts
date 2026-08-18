import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { advanceAnimationClock } from "@/domain/image/animationClock";
import { useAnimationPlayback } from "@/hooks/useAnimationPlayback";

describe("advanceAnimationClock", () => {
  it("stays on the current frame until its delay elapses", () => {
    expect(advanceAnimationClock(40, [50, 50], 0)).toEqual({
      index: 0,
      elapsedMs: 40,
    });
  });

  it("skips ahead when elapsed covers multiple delays", () => {
    expect(advanceAnimationClock(250, [50, 50, 50, 50, 50, 50, 50, 50], 0)).toEqual({
      index: 5,
      elapsedMs: 0,
    });
  });

  it("loops and keeps remainder", () => {
    expect(advanceAnimationClock(120, [50, 50], 0)).toEqual({
      index: 0,
      elapsedMs: 20,
    });
  });
});

describe("useAnimationPlayback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockImplementation(() => Date.now());
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
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
      vi.advanceTimersByTime(48);
    });
    expect(result.current.frameIndex).toBe(1);
    act(() => {
      vi.advanceTimersByTime(64);
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
      vi.advanceTimersByTime(48);
    });
    expect(result.current.frameIndex).toBe(1);
  });

  it("skips frames when a tick covers several delays", () => {
    const delaysMs = [50, 50, 50, 50, 50, 50, 50, 50];
    const { result } = renderHook(() =>
      useAnimationPlayback({ delaysMs, enabled: true })
    );
    act(() => {
      vi.advanceTimersByTime(16);
    });
    const start = result.current.frameIndex;
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.frameIndex).toBeGreaterThanOrEqual(start + 4);
    expect(advanceAnimationClock(250, delaysMs, 0).index).toBe(5);
  });
});
