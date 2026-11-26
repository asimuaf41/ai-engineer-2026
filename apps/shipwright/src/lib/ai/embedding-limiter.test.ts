import assert from "node:assert/strict";
import { test } from "node:test";
import { backoffMs, createLimiter, estimateTokens, makeBatches, RETRY_DELAYS_MS } from "./embedding-limiter.ts";

const text = (chars: number) => "x".repeat(chars);

test("batches stop at the text count, keep their order, and lose nothing", () => {
  const texts = Array.from({ length: 40 }, (_, i) => `t${i}`);
  const batches = makeBatches(texts, { maxTexts: 16, maxTokens: 100_000 });
  assert.deepEqual(batches.map((batch) => batch.length), [16, 16, 8]);
  assert.deepEqual(batches.flat(), texts);
});

test("batches also stop at the token budget, and one huge text goes alone", () => {
  const small = text(350); // about 100 tokens
  const huge = text(35_000); // about 10,000 tokens: more than the budget below
  assert.equal(estimateTokens(small), 100);
  const batches = makeBatches([small, small, huge, small], { maxTexts: 16, maxTokens: 250 });
  assert.deepEqual(batches.map((batch) => batch.length), [2, 1, 1]);
});

test("the limiter lets a request go when the minute has room", () => {
  const limiter = createLimiter({ maxTokensPerWindow: 8000, maxRequestsPerWindow: 3 });
  assert.equal(limiter.waitMs(0, 5000), 0);
  limiter.record(0, 2000);
  assert.equal(limiter.waitMs(1000, 5000), 0); // 2000 + 5000 <= 8000
});

test("it waits until enough tokens leave the minute", () => {
  const limiter = createLimiter({ maxTokensPerWindow: 8000, maxRequestsPerWindow: 3 });
  limiter.record(0, 5000);
  assert.equal(limiter.waitMs(10_000, 5000), 50_000); // the first request leaves the window at 60 s
  assert.equal(limiter.waitMs(60_000, 5000), 0);
});

test("it waits for the request limit even when the tokens are tiny", () => {
  const limiter = createLimiter({ maxTokensPerWindow: 8000, maxRequestsPerWindow: 3 });
  limiter.record(0, 10);
  limiter.record(5000, 10);
  limiter.record(10_000, 10);
  assert.equal(limiter.waitMs(11_000, 10), 49_000); // the 4th request waits for the 1st to leave (at 60 s)
});

test("a request bigger than the whole budget only needs an empty minute", () => {
  const limiter = createLimiter({ maxTokensPerWindow: 8000, maxRequestsPerWindow: 3 });
  assert.equal(limiter.waitMs(0, 50_000), 0);
  limiter.record(0, 8000);
  assert.equal(limiter.waitMs(1000, 50_000), 59_000);
});

test("the real token count replaces the estimate", () => {
  const limiter = createLimiter({ maxTokensPerWindow: 8000, maxRequestsPerWindow: 3 });
  const entry = limiter.record(0, 7000);
  entry.tokens = 1000; // Voyage said it was only 1000
  assert.equal(limiter.waitMs(1000, 5000), 0);
});

test("backoff doubles from 2 s to 32 s, stays at 32 s, and respects Retry-After", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9].map((attempt) => backoffMs(attempt, 0, 0)), [2000, 4000, 8000, 16_000, 32_000, 32_000, 32_000]);
  assert.equal(backoffMs(0, 20_000, 0), 20_000);
  assert.equal(RETRY_DELAYS_MS.length + 1, 6); // 6 tries in all
  assert.equal(backoffMs(0, 0, 1), 2500); // jitter adds at most 25%
});
