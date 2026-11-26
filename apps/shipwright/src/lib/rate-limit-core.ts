// A fixed-window counter limit, with the counter store passed in (Upstash Redis in production, memory in local dev).
// Pure apart from the store, so it is unit-tested with a fake one.
export type CounterStore = {
  // Adds 1 to the counter under `key` (it is created with `ttlSeconds` to live) and returns the new value.
  incr(key: string, ttlSeconds: number): Promise<number>;
};

export type WindowResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export async function checkWindow(
  store: CounterStore,
  input: { key: string; limit: number; windowSeconds: number; nowMs: number },
): Promise<WindowResult> {
  const { key, limit, windowSeconds, nowMs } = input;
  const windowIndex = Math.floor(nowMs / (windowSeconds * 1000));
  // The window number is part of the key, so a new window starts from 0 by itself. The extra seconds only tidy up old keys.
  const count = await store.incr(`${key}:${windowIndex}`, windowSeconds + 10);
  if (count <= limit) return { ok: true };
  const secondsIntoWindow = Math.floor(nowMs / 1000) % windowSeconds;
  return { ok: false, retryAfterSeconds: Math.max(1, windowSeconds - secondsIntoWindow) };
}
