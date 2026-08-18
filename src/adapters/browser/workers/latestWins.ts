/**
 * Latest-wins job helper: debounce, then run; abort the previous job when a
 * newer one is scheduled. Used by generation hooks and future frame loops.
 */

export class LatestWinsScheduler {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  private generation = 0;

  schedule(fn: (signal: AbortSignal) => Promise<void>, debounceMs = 0): void {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    const run = () => {
      this.timeoutId = null;
      this.controller?.abort();
      const controller = new AbortController();
      this.controller = controller;
      const gen = ++this.generation;
      void fn(controller.signal).catch((err) => {
        if (gen !== this.generation) return;
        if (controller.signal.aborted) return;
        if (err instanceof Error && /cancel/i.test(err.message)) return;
        throw err;
      });
    };
    if (debounceMs <= 0) {
      run();
      return;
    }
    this.timeoutId = setTimeout(run, debounceMs);
  }

  abort(): void {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.controller?.abort();
    this.generation += 1;
  }
}

export class ScanFrameGate {
  private busy = false;

  get isBusy(): boolean {
    return this.busy;
  }

  /**
   * Try to claim a decode slot. Returns false if a decode is already in flight
   * (caller should drop the frame).
   */
  tryBegin(): boolean {
    if (this.busy) return false;
    this.busy = true;
    return true;
  }

  end(): void {
    this.busy = false;
  }
}
