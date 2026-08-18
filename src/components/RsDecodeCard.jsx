import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useQRData, useQRDataDispatch } from "@/state/qr/QRDataContext";
import { useInputs } from "@/state/inputs/InputContext";
import { useParsedInputs } from "@/hooks/useParsedInputs";
import {
  buildBitIdIndex,
  getBlockBitIds,
  getDamagedReceived,
} from "@/domain/qr/reedsolomon/applyFlips";
import { decodeReedSolomon } from "@/domain/qr/reedsolomon";
import {
  applyVisualDamage,
  damagedIdsToDataBitIds,
  countDamageByKind,
  damageFinderCorner,
  corruptFormatInfo,
  damageTiming,
  damageAlignment,
  randomModules,
  eligibleCollisionModules,
} from "@/domain/qr/corruption";
import {
  exhaustiveSearchSpaceSize,
} from "@/domain/qr/solver";
import {
  validateDecode,
  decodeMatrixPayload,
} from "@/adapters/browser/validation";
import {
  clampWorkerCount,
} from "@/adapters/browser/findBruteForceCollisionParallel";
import { findTargetedCollisionParallel } from "@/adapters/browser/findTargetedCollisionParallel";
import { findCharacterChangeOffthread } from "@/adapters/browser/workers/jobs";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function formatSyndromes(syndromes) {
  if (!syndromes?.length) return "—";
  return syndromes
    .map((s) => s.toString(16).padStart(2, "0"))
    .join(" ");
}

function statusLabel(result) {
  if (!result) return "—";
  if (!result.ok) return "Failed";
  if (result.errorsCorrected === 0) return "Clean";
  return `Corrected (${result.errorsCorrected})`;
}

function statusClass(result) {
  if (!result) return "text-muted-foreground";
  if (!result.ok) return "text-red-700";
  if (result.errorsCorrected === 0) return "text-green-700";
  return "text-amber-700";
}

function formatChar(ch) {
  if (ch === " ") return "␠";
  if (ch === "") return "∅";
  return ch;
}

export function RsDecodeCard() {
  const { blocks, versionInfo, damagedModuleIds, highlightedIds, matrix, segments } =
    useQRData();
  const {
    highlightModules,
    clearAllHighlights,
    clearDamage,
    setDamagedModules,
  } = useQRDataDispatch();
  const { inputs, formatInfo } = useInputs();
  const { parsed } = useParsedInputs();
  const [clicked, setClicked] = useState(false);
  const [randomN, setRandomN] = useState(8);
  const [randomFilter, setRandomFilter] = useState("all");
  const [scanResult, setScanResult] = useState(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanDecoded, setScanDecoded] = useState(null);
  const [solverBusy, setSolverBusy] = useState(false);
  const [solverResult, setSolverResult] = useState(null);
  const [solverMessage, setSolverMessage] = useState(null);
  const [collisionBusy, setCollisionBusy] = useState(false);
  const [collisionResult, setCollisionResult] = useState(null);
  const [collisionMessage, setCollisionMessage] = useState(null);
  const [collisionProgress, setCollisionProgress] = useState(null);
  const [collisionMaxFlips, setCollisionMaxFlips] = useState(20);
  const [collisionMaxTrials, setCollisionMaxTrials] = useState(3000);
  const [collisionWorkers, setCollisionWorkers] = useState(() =>
    clampWorkerCount()
  );
  const collisionAbortRef = useRef(null);

  const collisionEligibleCount = useMemo(() => {
    if (!matrix) return 0;
    return eligibleCollisionModules(matrix).length;
  }, [matrix]);

  const collisionSearchSpace = useMemo(
    () =>
      exhaustiveSearchSpaceSize(
        collisionEligibleCount,
        Math.max(1, Math.floor(collisionMaxFlips) || 1)
      ),
    [collisionEligibleCount, collisionMaxFlips]
  );

  useEffect(() => {
    return () => {
      collisionAbortRef.current?.abort();
    };
  }, []);

  const twoS = versionInfo?.ecCodewordsPerBlock ?? 0;
  const t = Math.floor(twoS / 2);

  const orderedInputs = useMemo(
    () => inputs.map((input) => parsed[input.id] ?? input),
    [inputs, parsed]
  );

  const originalPayload = useMemo(
    () => orderedInputs.map((i) => i.data ?? i.text ?? "").join(""),
    [orderedInputs]
  );

  const expectedScanPayload =
    collisionResult?.decodedPayload ?? solverResult?.mutatedPayload ?? null;

  const bitIndex = useMemo(() => buildBitIdIndex(blocks ?? []), [blocks]);

  const flippedBitIds = useMemo(() => {
    if (!matrix) return [];
    return damagedIdsToDataBitIds(matrix, damagedModuleIds);
  }, [matrix, damagedModuleIds]);

  const damageCounts = useMemo(() => {
    if (!matrix) return { data: 0, structural: 0, total: 0 };
    return countDamageByKind(matrix, damagedModuleIds);
  }, [matrix, damagedModuleIds]);

  const blockReports = useMemo(() => {
    if (!blocks?.length || !twoS) return [];

    return blocks.map((block, blockIndex) => {
      const received = getDamagedReceived(
        block,
        blockIndex,
        flippedBitIds,
        bitIndex
      );
      const result = decodeReedSolomon(received, twoS);
      const bitIds = getBlockBitIds(block);
      const flipsInBlock = flippedBitIds.filter(
        (id) => bitIndex.get(id)?.blockIndex === blockIndex
      ).length;

      return {
        blockIndex,
        dataCount: block.data.length,
        ecCount: block.errorCorrection.length,
        bitIds,
        flipsInBlock,
        result,
      };
    });
  }, [blocks, flippedBitIds, bitIndex, twoS]);

  const isBlockHighlighted = (bitIds) =>
    bitIds.some((id) => highlightedIds.includes(id));

  const applyPreset = (ids) => {
    if (!ids?.length) return;
    setDamagedModules(ids);
    setScanResult(null);
    setScanDecoded(null);
  };

  const runScanCheck = async () => {
    if (!matrix) return;
    setScanBusy(true);
    setScanResult(null);
    setScanDecoded(null);
    try {
      const damaged = applyVisualDamage(matrix, damagedModuleIds);
      const [rate, decoded] = await Promise.all([
        validateDecode(damaged, 1),
        decodeMatrixPayload(damaged),
      ]);
      setScanDecoded(decoded);
      if (rate < 1 || decoded == null) {
        setScanResult("fail");
      } else if (
        expectedScanPayload != null &&
        decoded === expectedScanPayload
      ) {
        setScanResult("match");
      } else {
        setScanResult("pass");
      }
    } catch {
      setScanResult("fail");
    } finally {
      setScanBusy(false);
    }
  };

  const runCharacterSolver = async () => {
    if (!matrix || !blocks?.length || !versionInfo) return;
    setSolverBusy(true);
    setSolverMessage(null);
    setScanResult(null);
    setScanDecoded(null);
    try {
      const solution = await findCharacterChangeOffthread({
        inputs: orderedInputs,
        version: versionInfo.version,
        errorCorrectionLevel: formatInfo.errorCorrectionLevel,
        ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
        blocks,
        matrix,
        maxAlternativesPerChar:
          orderedInputs.some((i) => i.mode === "byte") ? 60 : undefined,
      });
      setSolverResult(solution);
      if (!solution) {
        setSolverMessage("No one-character mutation found.");
      }
    } catch (err) {
      setSolverResult(null);
      setSolverMessage(
        err instanceof Error ? err.message : "Solver failed."
      );
    } finally {
      setSolverBusy(false);
    }
  };

  const applySolverFlips = () => {
    if (!solverResult?.flipModuleIds?.length) return;
    setDamagedModules(solverResult.flipModuleIds);
    highlightModules(solverResult.flipBitIds);
    setScanResult(null);
    setScanDecoded(null);
  };

  const runCollisionSearch = async () => {
    if (!matrix || !blocks?.length || !versionInfo) return;
    const maxFlips = Math.max(1, Math.floor(collisionMaxFlips) || 1);
    const maxTrials = Math.max(1, Math.floor(collisionMaxTrials) || 1);
    const workerCount = clampWorkerCount(collisionWorkers);
    const maxExhaustive = Number.isFinite(collisionSearchSpace)
      ? collisionSearchSpace
      : Number.MAX_SAFE_INTEGER;

    collisionAbortRef.current?.abort();
    const abort = new AbortController();
    collisionAbortRef.current = abort;

    setCollisionBusy(true);
    setCollisionMessage(null);
    setCollisionResult(null);
    flushSync(() => {
      setCollisionProgress({
        trialsUsed: 0,
        maxTrials,
        k: 1,
        maxFlips,
        mode: "exhaustive",
        eligibleCount: collisionEligibleCount,
        workerCount,
        phase: "format",
      });
    });
    setScanResult(null);
    setScanDecoded(null);
    let lastPaint = 0;
    try {
      const result = await findTargetedCollisionParallel({
        matrix,
        originalPayload,
        blocks,
        segments: segments ?? [],
        inputs: orderedInputs,
        version: versionInfo.version,
        errorCorrectionLevel: formatInfo.errorCorrectionLevel,
        ecCodewordsPerBlock: versionInfo.ecCodewordsPerBlock,
        maxFlips,
        maxTrials,
        maxExhaustive,
        seed: 1,
        workerCount,
        signal: abort.signal,
        onProgress: async (progress) => {
          const now = performance.now();
          const shouldPaint =
            progress.trialsUsed <= 1 ||
            progress.trialsUsed >= progress.maxTrials ||
            now - lastPaint >= 100;
          if (!shouldPaint) return;

          lastPaint = now;
          flushSync(() => {
            setCollisionProgress({ ...progress, workerCount });
          });
          await new Promise((resolve) => {
            requestAnimationFrame(() => resolve());
          });
        },
      });
      if (abort.signal.aborted) return;
      setCollisionResult(result);
      if (result) {
        flushSync(() => {
          setCollisionProgress((prev) =>
            prev
              ? {
                  ...prev,
                  trialsUsed: result.trialsUsed,
                  k: result.flipCount,
                  workerCount,
                }
              : prev
          );
        });
      } else {
        setCollisionMessage(
          `No collision within ${maxFlips} flips / ${maxTrials} trials (${workerCount} workers).`
        );
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      setCollisionResult(null);
      setCollisionMessage(
        err instanceof Error ? err.message : "Collision search failed."
      );
    } finally {
      if (collisionAbortRef.current === abort) {
        collisionAbortRef.current = null;
      }
      setCollisionBusy(false);
    }
  };

  const applyCollisionFlips = () => {
    if (!collisionResult?.flipModuleIds?.length || !matrix) return;
    setDamagedModules(collisionResult.flipModuleIds);
    const bitIds = damagedIdsToDataBitIds(
      matrix,
      collisionResult.flipModuleIds
    );
    if (bitIds.length) highlightModules(bitIds);
    setScanResult(null);
    setScanDecoded(null);
  };

  const highlightCollisionFlips = () => {
    if (!collisionResult?.flipModuleIds?.length || !matrix) return;
    const bitIds = damagedIdsToDataBitIds(
      matrix,
      collisionResult.flipModuleIds
    );
    if (bitIds.length) {
      highlightModules(bitIds);
    } else {
      // Format-only flips have no data bit ids — still show applied damage
      setDamagedModules(collisionResult.flipModuleIds);
    }
  };

  return (
    <Card className="w-full flex flex-col min-h-0">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">RS Decode</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearDamage();
              setScanResult(null);
              setScanDecoded(null);
            }}
            disabled={damagedModuleIds.length === 0}
          >
            Clear damage
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Click any module on the QR canvas to damage it (data/EC or
          structural). RS rows only reflect data/EC flips — structural damage
          can break scanning while blocks stay Clean. Capacity t = {t}{" "}
          errors/block.
        </p>
        <div className="text-xs text-muted-foreground">
          Damaged: {damageCounts.total} (data {damageCounts.data} · structural{" "}
          {damageCounts.structural})
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Character-change solver
          </div>
          <p className="text-xs text-muted-foreground">
            Finds a one-character payload change that minimizes module flips by
            landing inside the target RS decoding radius (leave ≤ t errors per
            block).
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix || !blocks?.length || solverBusy}
              onClick={runCharacterSolver}
            >
              {solverBusy ? "Solving…" : "Solve"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!solverResult?.flipModuleIds?.length}
              onClick={applySolverFlips}
            >
              Apply flips
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!solverResult?.flipBitIds?.length}
              onClick={() => highlightModules(solverResult.flipBitIds)}
            >
              Highlight
            </Button>
          </div>
          {solverMessage && (
            <p className="text-xs text-muted-foreground">{solverMessage}</p>
          )}
          {solverResult && (
            <div className="text-xs space-y-1">
              <div>
                Change{" "}
                <span className="font-mono font-semibold">
                  {formatChar(solverResult.fromChar)}→
                  {formatChar(solverResult.toChar)}
                </span>{" "}
                at index {solverResult.charIndex}
              </div>
              <div className="font-mono break-all text-muted-foreground">
                {solverResult.originalText} → {solverResult.mutatedText}
              </div>
              <div className="text-muted-foreground">
                Flips {solverResult.flipModuleIds.length} modules (full distance{" "}
                {solverResult.fullDistance}, saved {solverResult.flipsSaved} via
                EC)
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Targeted collision
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-phase Vite-worker search: format → character seeds → per-block
            RS sphere → priority data. Finder/timing/alignment/separator
            excluded; format/version allowed. RS prefilter skips jsQR when
            blocks still recover the original. Workers shard with no overlap;
            first hit stops the rest.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Max flips
              <Input
                type="number"
                min={1}
                max={200}
                value={collisionMaxFlips}
                onChange={(e) =>
                  setCollisionMaxFlips(Number(e.target.value) || 1)
                }
                disabled={collisionBusy}
                className="h-8 w-16"
                aria-label="Max module flips"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Max trials
              <Input
                type="number"
                min={1}
                value={collisionMaxTrials}
                onChange={(e) =>
                  setCollisionMaxTrials(Number(e.target.value) || 1)
                }
                disabled={collisionBusy}
                className="h-8 w-24"
                aria-label="Max trials"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Workers
              <Input
                type="number"
                min={1}
                max={16}
                value={collisionWorkers}
                onChange={(e) =>
                  setCollisionWorkers(
                    clampWorkerCount(Number(e.target.value) || 1)
                  )
                }
                disabled={collisionBusy}
                className="h-8 w-14"
                aria-label="Worker count"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground font-mono tabular-nums">
            {collisionEligibleCount} eligible · full search space{" "}
            {Number.isFinite(collisionSearchSpace) &&
            collisionSearchSpace >= 1 ? (
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-50"
                disabled={collisionBusy || !matrix}
                onClick={() => setCollisionMaxTrials(collisionSearchSpace)}
                title="Set max trials to full search space"
              >
                {collisionSearchSpace.toLocaleString()}
              </button>
            ) : Number.isFinite(collisionSearchSpace) ? (
              collisionSearchSpace.toLocaleString()
            ) : (
              "∞"
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix || collisionBusy || solverBusy}
              onClick={runCollisionSearch}
            >
              {collisionBusy ? "Searching…" : "Find collision"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!collisionResult?.flipModuleIds?.length}
              onClick={applyCollisionFlips}
            >
              Apply flips
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!collisionResult?.flipModuleIds?.length}
              onClick={highlightCollisionFlips}
            >
              Highlight
            </Button>
          </div>
          {collisionProgress && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-foreground">
                  {collisionBusy ? "Searching" : "Last run"}
                  {collisionProgress.phase
                    ? ` · ${collisionProgress.phase}`
                    : ""}{" "}
                  · k={collisionProgress.k}/{collisionProgress.maxFlips} ·{" "}
                  {collisionProgress.mode}
                  {collisionProgress.workerCount
                    ? ` · ${collisionProgress.workerCount}w`
                    : ""}
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {collisionProgress.trialsUsed}/
                  {collisionProgress.maxTrials}
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={collisionProgress.maxTrials}
                aria-valuenow={collisionProgress.trialsUsed}
                aria-label="Brute-force collision search progress"
              >
                <div
                  className="h-full bg-foreground transition-[width] duration-100 ease-linear"
                  style={{
                    width: `${Math.min(
                      100,
                      (100 * collisionProgress.trialsUsed) /
                        Math.max(1, collisionProgress.maxTrials)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
          {collisionMessage && (
            <p className="text-xs text-muted-foreground">{collisionMessage}</p>
          )}
          {collisionResult && (
            <div className="text-xs space-y-1">
              <div>
                Collision with{" "}
                <span className="font-semibold">
                  {collisionResult.flipCount}
                </span>{" "}
                flips · {collisionResult.trialsUsed} trials
              </div>
              <div className="font-mono break-all text-muted-foreground">
                {originalPayload || "(empty)"} → {collisionResult.decodedPayload}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Presets
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() => applyPreset(damageFinderCorner(matrix, "tl"))}
            >
              Finder TL
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() => applyPreset(damageFinderCorner(matrix, "tr"))}
            >
              Finder TR
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() => applyPreset(damageFinderCorner(matrix, "bl"))}
            >
              Finder BL
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() => applyPreset(corruptFormatInfo(matrix))}
            >
              Format
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() => applyPreset(damageTiming(matrix))}
            >
              Timing
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() => applyPreset(damageAlignment(matrix))}
            >
              Alignment
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={999}
              value={randomN}
              onChange={(e) => setRandomN(Number(e.target.value) || 1)}
              className="h-8 w-16"
              aria-label="Random damage count"
            />
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={randomFilter}
              onChange={(e) => setRandomFilter(e.target.value)}
              aria-label="Random damage filter"
            >
              <option value="all">all</option>
              <option value="data">data</option>
              <option value="structural">structural</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={!matrix}
              onClick={() =>
                applyPreset(
                  randomModules(matrix, randomN, { filter: randomFilter })
                )
              }
            >
              Random
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!matrix || scanBusy}
              onClick={runScanCheck}
            >
              {scanBusy ? "Scanning…" : "Scan check"}
            </Button>
            {scanResult && (
              <span
                className={`text-sm font-semibold ${
                  scanResult === "fail"
                    ? "text-red-700"
                    : scanResult === "match"
                      ? "text-green-700"
                      : "text-amber-700"
                }`}
              >
                jsQR:{" "}
                {scanResult === "pass"
                  ? "Pass"
                  : scanResult === "match"
                    ? "Pass (target)"
                    : "Fail"}
              </span>
            )}
          </div>
          {scanDecoded != null && (
            <div className="text-xs font-mono break-all text-muted-foreground">
              Decoded: {scanDecoded}
              {expectedScanPayload != null && (
                <span>
                  {" "}
                  · expected: {expectedScanPayload}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative min-h-0 flex-1">
        {!blocks?.length ? (
          <p className="text-sm text-muted-foreground">No blocks to decode.</p>
        ) : (
          <ScrollArea className="h-[min(50vh,28rem)] pr-4">
            <div className="flex flex-col gap-2">
              {blockReports.map((report) => (
                <Button
                  key={report.blockIndex}
                  variant={
                    isBlockHighlighted(report.bitIds) ? "default" : "outline"
                  }
                  className="w-full h-auto py-3 px-3 justify-start text-left font-normal"
                  onClick={() => {
                    highlightModules(report.bitIds);
                    setClicked(!clicked);
                  }}
                  onMouseEnter={() => {
                    if (!clicked) highlightModules(report.bitIds);
                  }}
                  onMouseLeave={() => {
                    if (!clicked) clearAllHighlights();
                  }}
                >
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        Block {report.blockIndex}
                      </span>
                      <span
                        className={`text-sm font-semibold ${statusClass(report.result)}`}
                      >
                        {statusLabel(report.result)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        {report.dataCount} data / {report.ecCount} EC · data
                        flips {report.flipsInBlock} · errors{" "}
                        {report.result.errorsCorrected}/{t}
                      </div>
                      <div className="font-mono break-all">
                        S: {formatSyndromes(report.result.syndromes)}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
