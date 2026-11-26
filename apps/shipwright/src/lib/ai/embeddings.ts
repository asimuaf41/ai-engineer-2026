// Turns code chunks and search questions into vectors with Voyage AI (plain fetch, no SDK).
// Server only: it reads the API key. Never log the input text or the key.
import "server-only";
import { z } from "zod";
import { env } from "@/env";

import { EMBEDDING } from "./embedding-config";
import { backoffMs, createLimiter, estimateTokens, makeBatches, RETRY_DELAYS_MS } from "./embedding-limiter";

export { EMBEDDING };

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
// Gentle on purpose: an account without a payment method has low limits (see .env.example to raise them).
const MAX_CONCURRENT = 1; // one request at a time
const BATCH_TEXTS = 16; // texts per request
const REQUEST_TIMEOUT_MS = 60_000;
const LOG_EVERY_BATCHES = 10;

export class EmbeddingError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmbeddingError";
    this.status = status;
  }
}

// Thrown when the caller's deadline would pass during a wait or a request. Its name is the one the index runner already
// understands ("IndexTimeoutError"), so the founder sees the plain "took longer than allowed" message and the run is closed properly.
export class EmbeddingDeadlineError extends Error {
  constructor() {
    super("The embedding work would pass the caller's deadline.");
    this.name = "IndexTimeoutError";
  }
}

const responseSchema = z.object({
  data: z.array(z.object({ index: z.number().int().nonnegative(), embedding: z.array(z.number()) })),
  usage: z.object({ total_tokens: z.number().int().nonnegative() }),
});

type InputType = "document" | "query";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Retry-After is either seconds or an HTTP date. Returns milliseconds, or 0 if missing or unreadable.
function retryAfterMs(header: string | null): number {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
}

const shouldRetry = (status: number) => status === 429 || status >= 500;

// One limiter for the whole process, so a search question and an index run share the same minute.
let limiter: ReturnType<typeof createLimiter> | undefined;
const getLimiter = () =>
  (limiter ??= createLimiter({ maxTokensPerWindow: env.EMBEDDING_MAX_TOKENS_PER_MINUTE, maxRequestsPerWindow: env.EMBEDDING_MAX_REQUESTS_PER_MINUTE }));

// Numbers only, one line per LOG_EVERY_BATCHES document batches (a running total since the server started; search questions are
// not counted). Never any of the text that was sent.
const progress = { batches: 0, tokens: 0, waitedMs: 0 };
function noteBatch(tokens: number) {
  progress.batches += 1;
  progress.tokens += tokens;
  if (progress.batches % LOG_EVERY_BATCHES === 0) {
    console.info(`[embed] batches=${progress.batches} tokens=${progress.tokens} waited_s=${Math.round(progress.waitedMs / 1000)}`);
  }
}

// Stops before a wait (or a request) that would run past the deadline, instead of being killed halfway.
function assertTimeLeft(deadline: number | undefined, needMs: number): void {
  if (deadline !== undefined && Date.now() + needMs > deadline) throw new EmbeddingDeadlineError();
}

async function requestBatch(apiKey: string, texts: string[], inputType: InputType, deadline?: number): Promise<{ vectors: number[][]; tokens: number }> {
  const estimated = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
  for (let attempt = 0; ; attempt++) {
    // Wait until the minute has room for this request (every try counts, a refused one too). The check is repeated after each
    // sleep, and the request is recorded in the same synchronous step, so two callers can't both claim the same free slot.
    // A search question (a few tokens, and a person is waiting) doesn't queue behind the index run, but is still recorded.
    for (;;) {
      const polite = inputType === "query" ? 0 : getLimiter().waitMs(Date.now(), estimated);
      if (polite <= 0) break;
      assertTimeLeft(deadline, polite);
      progress.waitedMs += polite;
      await sleep(polite);
    }
    const sent = getLimiter().record(Date.now(), estimated);
    assertTimeLeft(deadline, 0);

    let response: Response | undefined;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          input: texts,
          model: EMBEDDING.model,
          input_type: inputType,
          output_dimension: EMBEDDING.dims,
        }),
        signal: AbortSignal.timeout(deadline === undefined ? REQUEST_TIMEOUT_MS : Math.max(1, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now()))),
      });
    } catch {
      // Network failure or timeout: treated like a 5xx. (The error itself is dropped on purpose.)
      sent.tokens = 0; // it never reached Voyage's count, so it must not hold up the next request
    }

    if (response?.ok) {
      const result = parseResponse(await response.json().catch(() => null), texts.length);
      sent.tokens = result.tokens; // the real count replaces the estimate
      if (inputType === "document") noteBatch(result.tokens);
      return result;
    }

    const status = response?.status;
    const retryable = status === undefined || shouldRetry(status);
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
      throw new EmbeddingError(describeFailure(status), status);
    }
    // A refused try: wait 2, 4, 8, 16, 32 s (or what Retry-After says), then carry on instead of failing the whole index.
    const pause = backoffMs(attempt, retryAfterMs(response?.headers.get("retry-after") ?? null), Math.random());
    assertTimeLeft(deadline, pause);
    progress.waitedMs += pause;
    await sleep(pause);
  }
}

function describeFailure(status: number | undefined): string {
  if (status === undefined) return "Voyage request failed (network error or timeout)";
  if (status === 401) return "Voyage rejected the API key";
  if (status === 400) return "Voyage rejected the request";
  if (status === 429) return "Voyage rate limit hit, gave up after retries";
  return `Voyage request failed with status ${status}`;
}

function parseResponse(json: unknown, expected: number): { vectors: number[][]; tokens: number } {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) throw new EmbeddingError("Voyage returned an unexpected response shape");
  if (parsed.data.data.length !== expected) {
    throw new EmbeddingError(`Voyage returned ${parsed.data.data.length} vectors for ${expected} texts`);
  }
  const vectors: number[][] = new Array(expected);
  for (const item of parsed.data.data) {
    if (item.index >= expected || vectors[item.index] !== undefined) {
      throw new EmbeddingError("Voyage returned bad vector indexes");
    }
    if (item.embedding.length !== EMBEDDING.dims) {
      throw new EmbeddingError(`Expected ${EMBEDDING.dims} numbers per vector, got ${item.embedding.length}`);
    }
    vectors[item.index] = item.embedding;
  }
  return { vectors, tokens: parsed.data.usage.total_tokens };
}

async function embed(texts: string[], inputType: InputType, deadline?: number): Promise<{ vectors: number[][]; tokens: number }> {
  const apiKey = env.VOYAGE_API_KEY;
  if (!apiKey) throw new EmbeddingError("VOYAGE_API_KEY is not set");
  if (texts.length === 0) return { vectors: [], tokens: 0 };

  const batches = makeBatches(texts, { maxTexts: BATCH_TEXTS, maxTokens: Math.floor(env.EMBEDDING_MAX_TOKENS_PER_MINUTE / 2) });
  const results: { vectors: number[][]; tokens: number }[] = new Array(batches.length);
  let next = 0;
  // One worker (MAX_CONCURRENT) takes the next batch until none are left; results go back in their original place.
  const worker = async () => {
    while (next < batches.length) {
      const i = next++;
      results[i] = await requestBatch(apiKey, batches[i] as string[], inputType, deadline);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, batches.length) }, worker));

  return {
    vectors: results.flatMap((result) => result.vectors),
    tokens: results.reduce((sum, result) => sum + result.tokens, 0),
  };
}

/**
 * Code chunks to index. Returns one vector per text, in the same order, plus the tokens Voyage billed.
 * `deadline` (a time in ms since 1970): if a wait or a retry would pass it, this throws a timeout error instead of going on.
 */
export function embedDocuments(texts: string[], options: { deadline?: number } = {}): Promise<{ vectors: number[][]; tokens: number }> {
  return embed(texts, "document", options.deadline);
}

/** A search question. Uses input_type "query", which Voyage tunes for matching against documents. */
export async function embedQuery(text: string): Promise<number[]> {
  const { vectors } = await embed([text], "query");
  return vectors[0] as number[];
}
