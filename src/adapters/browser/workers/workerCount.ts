const MAX_WORKERS = 16;

function defaultWorkerCount(): number {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return 4;
}

export function clampWorkerCount(requested?: number): number {
  const n =
    requested == null || !Number.isFinite(requested)
      ? defaultWorkerCount()
      : Math.floor(requested);
  return Math.min(MAX_WORKERS, Math.max(1, n));
}
