import { describe, it, expect, vi } from "vitest";
import {
  WorkerPool,
  JobCancelledError,
  setWorkerPoolForTests,
} from "../pool";
import { ScanFrameGate, LatestWinsScheduler } from "../latestWins";
import { handleJob } from "../handlers";
import { optimizeBlock } from "@/domain/qart/blockOptimizer";
import { ReedSolomonEncoder } from "@/domain/qr/reedsolomon";
import type { QRBlock } from "@/domain/qr/codewords/blocks";
import type { BitPosition } from "@/domain/qart/bitPriority";
import type { OptimizeBlockPayload } from "../protocol";

function tinyBlock(): QRBlock {
  const bits = Array.from({ length: 8 }, (_, i) => ({
    id: `b${i}`,
    value: 0,
    sourceId: "pad",
    type: "padding",
  }));
  return {
    data: [{ type: "data", id: "cw0", bits }],
    errorCorrection: [
      {
        type: "errorCorrection",
        id: "ec0",
        bits: Array.from({ length: 8 }, (_, i) => ({
          id: `e${i}`,
          value: 0,
          sourceId: "ec",
          type: "ec",
        })),
      },
    ],
  };
}

describe("WorkerPool fallback", () => {
  it("runs jobs in-process when forceFallback is set", async () => {
    const pool = new WorkerPool({ forceFallback: true, workerCount: 2 });
    expect(pool.isFallback).toBe(true);
    const result = await pool.enqueue<Float32Array>({
      type: "importanceMap",
      payload: {
        image: {
          data: new Uint8ClampedArray(16),
          width: 2,
          height: 2,
        },
        size: 2,
        alpha: 0.5,
      },
    });
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(4);
  });

  it("rejects aborted jobs before they start", async () => {
    const pool = new WorkerPool({ forceFallback: true });
    const controller = new AbortController();
    controller.abort();
    await expect(
      pool.enqueue({
        type: "importanceMap",
        payload: {
          image: { data: new Uint8ClampedArray(4), width: 1, height: 1 },
          size: 1,
          alpha: 0.5,
        },
        signal: controller.signal,
      })
    ).rejects.toBeInstanceOf(JobCancelledError);
  });

  it("setWorkerPoolForTests replaces the singleton", () => {
    const pool = new WorkerPool({ forceFallback: true, workerCount: 1 });
    setWorkerPoolForTests(pool);
    setWorkerPoolForTests(null);
  });
});

describe("ScanFrameGate", () => {
  it("drops frames while a decode is in flight", () => {
    const gate = new ScanFrameGate();
    expect(gate.tryBegin()).toBe(true);
    expect(gate.isBusy).toBe(true);
    expect(gate.tryBegin()).toBe(false);
    gate.end();
    expect(gate.tryBegin()).toBe(true);
    gate.end();
  });
});

describe("LatestWinsScheduler", () => {
  it("aborts the previous run when a newer one is scheduled", async () => {
    const scheduler = new LatestWinsScheduler();
    const seen: number[] = [];
    scheduler.schedule(async (signal) => {
      await new Promise((r) => setTimeout(r, 30));
      if (!signal.aborted) seen.push(1);
    }, 0);
    scheduler.schedule(async (signal) => {
      await new Promise((r) => setTimeout(r, 5));
      if (!signal.aborted) seen.push(2);
    }, 0);
    await new Promise((r) => setTimeout(r, 50));
    expect(seen).toEqual([2]);
    scheduler.abort();
  });
});

describe("optimizeBlock job parity", () => {
  it("matches in-process optimizeBlock", async () => {
    const blockA = tinyBlock();
    const blockB = tinyBlock();
    const bitOrder: BitPosition[] = [
      { bi: 0, x: 0, y: 0, priority: 1, bitId: "b0" },
    ];
    const valueGrid = new Float32Array([0.1]);
    const encoder = new ReedSolomonEncoder(1);

    const direct = optimizeBlock(
      blockA,
      bitOrder,
      valueGrid,
      1,
      1,
      new Set([0]),
      encoder
    );

    const payload: OptimizeBlockPayload = {
      blockIndex: 0,
      block: blockB,
      bitOrder,
      valueGrid,
      dimension: 1,
      ecCodewordsPerBlock: 1,
      editableIndices: [0],
    };
    const viaJob = (await handleJob("optimizeBlock", payload)) as {
      optimized: number;
      controlledBits: Array<[string, boolean]>;
    };

    expect(viaJob.optimized).toBe(direct.optimized);
    expect(viaJob.controlledBits.length).toBe(direct.controlledBits.size);
  });
});

describe("collision sibling cancel", () => {
  it("aborting sibling jobs does not throw from Promise.all with JobCancelledError swallowed", async () => {
    const pool = new WorkerPool({ forceFallback: true, workerCount: 2 });
    const a = new AbortController();
    const b = new AbortController();
    const jobA = pool
      .enqueue({
        type: "importanceMap",
        payload: {
          image: { data: new Uint8ClampedArray(16), width: 2, height: 2 },
          size: 2,
          alpha: 0.5,
        },
        signal: a.signal,
      })
      .catch((err) => {
        if (err instanceof JobCancelledError) return null;
        throw err;
      });
    const jobB = pool.enqueue({
      type: "importanceMap",
      payload: {
        image: { data: new Uint8ClampedArray(16), width: 2, height: 2 },
        size: 2,
        alpha: 0.5,
      },
      signal: b.signal,
    });
    b.abort();
    const results = await Promise.all([jobA, jobB.catch(() => null)]);
    expect(results.length).toBe(2);
  });
});

vi.unstubAllGlobals();
