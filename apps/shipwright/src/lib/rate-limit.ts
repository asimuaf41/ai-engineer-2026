// A tiny fixed-window rate limit: each IP gets LIMIT requests per WINDOW_MS, then waits.
// Honest limits: the counters live in this server instance's memory. Vercel can run several
// instances (and restarts them), so the real limit is looser than it looks. When we add accounts
// (auth), the per-visitor limit moves to the account. The daily quota in quota.ts already uses Upstash Redis;
// this file is only the cheap first guard against bursts. It is a brake, not a wall.
const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 10_000; // safety cap so a flood of fake IPs can't fill the memory

type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, now = Date.now()): RateLimitResult {
  // Clean up: forget every window that already ended, so the Map can't grow forever.
  for (const [entryKey, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(entryKey);
  }
  // Still too big (a flood inside one window): drop the oldest entries first (Maps keep insertion order).
  for (const oldest of entries.keys()) {
    if (entries.size < MAX_ENTRIES) break;
    entries.delete(oldest);
  }

  const current = entries.get(key);
  if (!current) {
    entries.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (current.count >= LIMIT) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}
