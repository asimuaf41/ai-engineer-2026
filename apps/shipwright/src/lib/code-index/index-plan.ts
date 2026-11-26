// The small decisions of an index run, as pure functions (no I/O), so they can be tested without a database or the network.
import { EMBEDDING } from "../ai/embedding-config.ts";
import { estimateTokens } from "../ai/embedding-limiter.ts";

export const MAX_CHUNKS = 20_000; // more than this: stop with a clear failure, never silently cut
export const STALE_AFTER_MS = 15 * 60 * 1000; // a "running" index older than this is a dead run
export const EMBED_GROUP_SIZE = 16; // texts per embedDocuments call (one Voyage request; see embeddings.ts)

export class ChunkLimitError extends Error {
  constructor(count: number) {
    super(`The repo produced ${count} chunks, the limit is ${MAX_CHUNKS}.`);
    this.name = "ChunkLimitError";
  }
}

// The page that runs us may live 300 seconds. We stop on our own a little earlier, so the run is closed properly (marked
// failed with a clear message) instead of being killed halfway.
export const SOFT_DEADLINE_MS = 270_000;

export class IndexTimeoutError extends Error {
  constructor() {
    super("The index run reached its time limit.");
    this.name = "IndexTimeoutError";
  }
}

export class IndexTooSlowError extends Error {
  constructor(minutes: number) {
    super(`Embedding the new chunks would take about ${minutes} minutes at the current Voyage limits.`);
    this.name = "IndexTooSlowError";
  }
}

// Before paying for anything: can the new chunks be embedded in the time we have, at the tokens-per-minute budget? The first
// minute's budget is free to use at once, the rest goes at the per-minute pace. (Sizes are estimates; Voyage reports the real count.)
export function assertCanFinish(texts: string[], tokensPerMinute: number, elapsedMs: number): void {
  const tokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
  const needMs = (Math.max(0, tokens - tokensPerMinute) / tokensPerMinute) * 60_000;
  if (elapsedMs + needMs > SOFT_DEADLINE_MS) throw new IndexTooSlowError(Math.ceil(needMs / 60_000));
}

export function assertWithinDeadline(startedAtMs: number, nowMs: number): void {
  if (nowMs - startedAtMs > SOFT_DEADLINE_MS) throw new IndexTimeoutError();
}

export function assertChunkLimit(count: number): void {
  if (count > MAX_CHUNKS) throw new ChunkLimitError(count);
}

// Dollars for a number of tokens, rounded to 4 decimals (the size of the cost_usd column).
export function costUsd(tokens: number): number {
  return Math.round((tokens / 1_000_000) * EMBEDDING.usdPerMTokens * 10_000) / 10_000;
}

export function isStale(startedAt: string | Date | null | undefined, now: Date): boolean {
  if (!startedAt) return false;
  const started = new Date(startedAt).getTime();
  return Number.isFinite(started) && now.getTime() - started > STALE_AFTER_MS;
}

// Development only: DEV_INDEX_MAX_CHUNKS=N indexes just the first N chunks, so a test run is quick and free on a small Voyage
// account. It is ignored in production, so a stray setting can never shrink a customer's index.
export function devSampleLimit(configured: number, nodeEnv: string | undefined): number {
  return nodeEnv === "production" || !Number.isInteger(configured) || configured <= 0 ? 0 : configured;
}

// Source code first (`src/`), then everything else, and docs last. The order inside each group is kept, so the same N chunks are
// chosen every time, which is what lets a second sample run reuse them for free.
const sampleRank = (path: string): number => {
  if (/\.(md|mdx|txt)$/i.test(path) || /(^|\/)docs?\//i.test(path)) return 2;
  return /(^|\/)src\//.test(path) ? 0 : 1;
};

export function pickSample<T extends { path: string }>(chunks: T[], max: number): { kept: T[]; leftOut: number } {
  if (max <= 0 || chunks.length <= max) return { kept: chunks, leftOut: 0 };
  const kept = chunks
    .map((chunk, index) => ({ chunk, index, rank: sampleRank(chunk.path) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, max)
    .map((entry) => entry.chunk);
  return { kept, leftOut: chunks.length - kept.length };
}

export function groupsOf<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

// Splits chunks into: ones whose embedding already exists in the last ready index (`known`, no cost), and new ones.
// New ones are grouped by hash: identical code in two files is embedded (and paid for) once, then saved for both.
export function planEmbeddings<T extends { contentHash: string }>(
  chunks: T[],
  knownHashes: ReadonlySet<string>,
): { known: T[]; fresh: Map<string, T[]> } {
  const known: T[] = [];
  const fresh = new Map<string, T[]>();
  for (const chunk of chunks) {
    if (knownHashes.has(chunk.contentHash)) {
      known.push(chunk);
      continue;
    }
    const same = fresh.get(chunk.contentHash);
    if (same) same.push(chunk);
    else fresh.set(chunk.contentHash, [chunk]);
  }
  return { known, fresh };
}
