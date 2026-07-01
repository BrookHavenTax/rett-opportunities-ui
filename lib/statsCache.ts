import type { Stats } from '@/types/listing';

/**
 * Process-local cache for the grade/stat counts shown on the stat cards.
 *
 * Counts only ever change when leads are inserted/updated by the import
 * pipeline (grade is import-only — it is not editable via PATCH), so the cache
 * is explicitly invalidated by the import route the moment an import finishes.
 * That keeps the stat cards correct immediately after an import instead of
 * showing a stale value for up to `TTL_MS`.
 *
 * PM2 runs the server as a single fork, so this module singleton is shared by
 * the stats route and the import route in the same process.
 */

const TTL_MS = 5 * 60 * 1000;

let cache: { at: number; data: Stats } | null = null;

export function getCachedStats(now: number = Date.now()): Stats | null {
  return cache && now - cache.at < TTL_MS ? cache.data : null;
}

export function setCachedStats(data: Stats, now: number = Date.now()): void {
  cache = { at: now, data };
}

export function invalidateStatsCache(): void {
  cache = null;
}
