/** Frame-level parallelism. Each QArt solve already shards blocks across workers. */
export const ANIMATION_FRAME_CONCURRENCY = 2;

/**
 * Map `fn` over `items` with at most `limit` promises in flight.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  if (items.length === 0) return results;

  const concurrency = Math.max(1, Math.min(limit, items.length));
  let next = 0;

  async function worker(): Promise<void> {
    let index = next;
    next += 1;
    while (index < items.length) {
      results[index] = await fn(items[index], index);
      index = next;
      next += 1;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
