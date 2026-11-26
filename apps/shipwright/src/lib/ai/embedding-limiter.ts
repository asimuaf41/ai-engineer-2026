// The pure parts of "talk to Voyage politely" (no network, no env, no clock of its own), so they can be unit-tested.
// embeddings.ts wires them to the real clock and the real settings.

// Rough size of a text, only used to cut batches and to plan waits. Voyage tells us the real number after each reply.
export const CHARS_PER_TOKEN = 3.5;
export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

// Splits texts into batches of at most `maxTexts` texts and `maxTokens` estimated tokens. Order is kept.
// One text bigger than the token budget goes alone (Voyage truncates it to the model's context).
export function makeBatches(texts: string[], limits: { maxTexts: number; maxTokens: number }): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;
  for (const text of texts) {
    const tokens = estimateTokens(text);
    if (current.length > 0 && (current.length >= limits.maxTexts || currentTokens + tokens > limits.maxTokens)) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(text);
    currentTokens += tokens;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

type Entry = { at: number; tokens: number };

// Remembers the requests of the last minute and says how long to wait before the next one so that neither
// "tokens per minute" nor "requests per minute" is exceeded. The caller passes the time in, so a test can fake the clock.
export function createLimiter(limits: { maxTokensPerWindow: number; maxRequestsPerWindow: number; windowMs?: number }) {
  const windowMs = limits.windowMs ?? 60_000;
  const entries: Entry[] = [];

  const forget = (now: number) => {
    while (entries[0] && entries[0].at <= now - windowMs) entries.shift();
  };

  return {
    // Milliseconds to wait (0 = go now) before a request of about `tokens` tokens.
    waitMs(now: number, tokens: number): number {
      forget(now);
      // A request bigger than the whole budget could never pass: it only needs an empty window.
      const need = Math.min(tokens, limits.maxTokensPerWindow);
      let usedTokens = entries.reduce((sum, entry) => sum + entry.tokens, 0);
      let count = entries.length;
      let wait = 0;
      for (const oldest of entries) {
        if (count + 1 <= limits.maxRequestsPerWindow && usedTokens + need <= limits.maxTokensPerWindow) break;
        wait = oldest.at + windowMs - now; // when this entry leaves the window
        usedTokens -= oldest.tokens;
        count -= 1;
      }
      return Math.max(0, wait);
    },
    // Call when a request is sent. Returns the entry, so the real token count can replace the estimate afterwards.
    record(now: number, tokens: number): Entry {
      const entry = { at: now, tokens };
      entries.push(entry);
      return entry;
    },
  };
}

// After a 429 (or a 5xx): 2, 4, 8, 16, 32 seconds, and never less than the server's own Retry-After. `jitter` is 0..1.
export const RETRY_DELAYS_MS = [2000, 4000, 8000, 16_000, 32_000];

export function backoffMs(attempt: number, retryAfterMs: number, jitter: number): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 0;
  return Math.max(base, retryAfterMs) + jitter * base * 0.25;
}
