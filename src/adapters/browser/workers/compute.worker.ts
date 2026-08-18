/**
 * Shared compute worker: one module handles all off-thread job types.
 */

import { handleJob } from "./handlers";
import type { WorkerInMessage, WorkerOutMessage } from "./protocol";

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerInMessage>) => void) | null;
  postMessage: (message: WorkerOutMessage, transfer?: Transferable[]) => void;
};

const ctx = self as unknown as WorkerScope;

let currentId: string | null = null;
let currentAbort: AbortController | null = null;

ctx.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.kind === "abort") {
    if (currentId === msg.id) {
      currentAbort?.abort();
    }
    return;
  }

  if (msg.kind !== "run") return;

  currentId = msg.id;
  currentAbort = new AbortController();
  const id = msg.id;

  try {
    const result = await handleJob(msg.type, msg.payload, {
      signal: currentAbort.signal,
      onProgress: (progress) => {
        const out: WorkerOutMessage = { kind: "progress", id, progress };
        ctx.postMessage(out);
      },
    });

    if (currentAbort.signal.aborted) {
      const out: WorkerOutMessage = {
        kind: "error",
        id,
        message: "Job was cancelled",
        cancelled: true,
      };
      ctx.postMessage(out);
      return;
    }

    const out: WorkerOutMessage = { kind: "result", id, result };
    ctx.postMessage(out);
  } catch (err) {
    const cancelled =
      currentAbort.signal.aborted ||
      (err instanceof Error && /cancel/i.test(err.message));
    const out: WorkerOutMessage = {
      kind: "error",
      id,
      message: err instanceof Error ? err.message : String(err),
      cancelled,
    };
    ctx.postMessage(out);
  } finally {
    if (currentId === id) {
      currentId = null;
      currentAbort = null;
    }
  }
};
