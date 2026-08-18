/**
 * Persistent Web Worker pool with FIFO jobs, abort-by-id, and in-process fallback.
 */

import { clampWorkerCount as clampCount } from "./workerCount";
import { handleJob } from "./handlers";
import type {
  JobType,
  WorkerInMessage,
  WorkerOutMessage,
} from "./protocol";

export { clampWorkerCount } from "./workerCount";

const MAX_WORKERS = 16;

export function canUseWorkers(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof URL !== "undefined"
  );
}

export class JobCancelledError extends Error {
  constructor(message = "Job was cancelled") {
    super(message);
    this.name = "JobCancelledError";
  }
}

export interface EnqueueOptions {
  type: JobType;
  payload: unknown;
  transfer?: Transferable[];
  signal?: AbortSignal;
  onProgress?: (progress: unknown) => void;
}

interface PendingJob {
  id: string;
  type: JobType;
  payload: unknown;
  transfer?: Transferable[];
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  onProgress?: (progress: unknown) => void;
  signal?: AbortSignal;
  abortHandler?: () => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
  currentJobId: string | null;
}

export interface WorkerPoolOptions {
  workerCount?: number;
  forceFallback?: boolean;
}

let jobSeq = 0;

function nextJobId(): string {
  jobSeq += 1;
  return `job-${jobSeq}-${Math.random().toString(36).slice(2, 8)}`;
}

export class WorkerPool {
  private readonly size: number;
  private readonly fallback: boolean;
  private readonly slots: WorkerSlot[] = [];
  private readonly queue: PendingJob[] = [];
  private readonly pending = new Map<string, PendingJob>();
  private spawnFailed = false;

  constructor(options: WorkerPoolOptions = {}) {
    this.size = clampCount(options.workerCount);
    this.fallback =
      options.forceFallback === true ||
      !canUseWorkers() ||
      this.size < 1;
  }

  get workerCount(): number {
    return this.fallback || this.spawnFailed ? 0 : this.slots.length || this.size;
  }

  get isFallback(): boolean {
    return this.fallback || this.spawnFailed;
  }

  enqueue<T>(options: EnqueueOptions): Promise<T> {
    if (options.signal?.aborted) {
      return Promise.reject(new JobCancelledError());
    }

    if (this.fallback || this.spawnFailed) {
      return this.runFallback<T>(options);
    }

    this.ensureWorkers();
    if (this.spawnFailed) {
      return this.runFallback<T>(options);
    }

    return new Promise<T>((resolve, reject) => {
      const id = nextJobId();
      const job: PendingJob = {
        id,
        type: options.type,
        payload: options.payload,
        transfer: options.transfer,
        resolve: (v) => resolve(v as T),
        reject,
        onProgress: options.onProgress,
        signal: options.signal,
      };
      if (options.signal) {
        job.abortHandler = () => this.abort(id);
        options.signal.addEventListener("abort", job.abortHandler, {
          once: true,
        });
      }
      this.pending.set(id, job);
      this.queue.push(job);
      this.pump();
    });
  }

  abort(id: string): void {
    const queuedIdx = this.queue.findIndex((j) => j.id === id);
    if (queuedIdx >= 0) {
      const [job] = this.queue.splice(queuedIdx, 1);
      this.finishCancel(job);
      return;
    }
    const job = this.pending.get(id);
    if (!job) return;
    for (const slot of this.slots) {
      if (slot.currentJobId === id) {
        const msg: WorkerInMessage = { kind: "abort", id };
        try {
          slot.worker.postMessage(msg);
        } catch {
          /* ignore */
        }
      }
    }
  }

  abortAll(): void {
    for (const id of [...this.pending.keys()]) {
      this.abort(id);
    }
  }

  private finishCancel(job: PendingJob): void {
    this.pending.delete(job.id);
    if (job.abortHandler && job.signal) {
      job.signal.removeEventListener("abort", job.abortHandler);
    }
    job.reject(new JobCancelledError());
  }

  private ensureWorkers(): void {
    if (this.slots.length > 0 || this.spawnFailed) return;
    const n = Math.min(MAX_WORKERS, Math.max(1, this.size));
    for (let i = 0; i < n; i++) {
      try {
        const worker = new Worker(new URL("./compute.worker.ts", import.meta.url), {
          type: "module",
        });
        const slot: WorkerSlot = { worker, busy: false, currentJobId: null };
        worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
          this.onWorkerMessage(slot, event.data);
        };
        worker.onerror = (event) => {
          const job = slot.currentJobId
            ? this.pending.get(slot.currentJobId)
            : undefined;
          slot.busy = false;
          slot.currentJobId = null;
          if (job) {
            this.pending.delete(job.id);
            job.reject(new Error(event.message || "Compute worker failed"));
          }
          this.pump();
        };
        this.slots.push(slot);
      } catch {
        this.spawnFailed = true;
        for (const s of this.slots) {
          try {
            s.worker.terminate();
          } catch {
            /* ignore */
          }
        }
        this.slots.length = 0;
        return;
      }
    }
  }

  private onWorkerMessage(slot: WorkerSlot, msg: WorkerOutMessage | undefined): void {
    if (!msg) return;
    const job = this.pending.get(msg.id);
    if (msg.kind === "progress") {
      job?.onProgress?.(msg.progress);
      return;
    }

    if (!job) {
      slot.busy = false;
      slot.currentJobId = null;
      this.pump();
      return;
    }

    this.pending.delete(job.id);
    if (job.abortHandler && job.signal) {
      job.signal.removeEventListener("abort", job.abortHandler);
    }
    slot.busy = false;
    slot.currentJobId = null;

    if (msg.kind === "error") {
      if (msg.cancelled || job.signal?.aborted) {
        job.reject(new JobCancelledError(msg.message));
      } else {
        job.reject(new Error(msg.message));
      }
    } else {
      job.resolve(msg.result);
    }
    this.pump();
  }

  private pump(): void {
    if (this.fallback || this.spawnFailed) return;
    for (const slot of this.slots) {
      if (slot.busy) continue;
      const job = this.queue.shift();
      if (!job) return;
      if (job.signal?.aborted) {
        this.finishCancel(job);
        continue;
      }
      slot.busy = true;
      slot.currentJobId = job.id;
      const transfer = job.transfer ?? [];
      const msg: WorkerInMessage = {
        kind: "run",
        id: job.id,
        type: job.type,
        payload: job.payload,
      };
      try {
        slot.worker.postMessage(msg, transfer);
      } catch {
        // Transfer list may contain buffers already detached; retry without transfer.
        try {
          slot.worker.postMessage(msg);
        } catch (err) {
          slot.busy = false;
          slot.currentJobId = null;
          this.pending.delete(job.id);
          job.reject(
            err instanceof Error ? err : new Error(String(err))
          );
        }
      }
    }
  }

  private async runFallback<T>(options: EnqueueOptions): Promise<T> {
    if (options.signal?.aborted) {
      throw new JobCancelledError();
    }
    return handleJob(options.type, options.payload, {
      signal: options.signal,
      onProgress: options.onProgress,
    }) as Promise<T>;
  }
}

let defaultPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!defaultPool) {
    defaultPool = new WorkerPool();
  }
  return defaultPool;
}

/** Test helper — replace the singleton. */
export function setWorkerPoolForTests(pool: WorkerPool | null): void {
  defaultPool = pool;
}
