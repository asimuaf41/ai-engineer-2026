import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWindow, type CounterStore } from "./rate-limit-core.ts";

// A fake counter store that remembers every call, like a tiny Redis.
function fakeStore() {
  const counts = new Map<string, number>();
  const ttls: number[] = [];
  const store: CounterStore = {
    async incr(key, ttlSeconds) {
      ttls.push(ttlSeconds);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key) as number;
    },
  };
  return { store, counts, ttls };
}

const base = { limit: 30, windowSeconds: 60 };
const T0 = Date.UTC(2026, 10, 24, 12, 0, 10); // 10 seconds into a minute

test("30 searches in a minute are allowed, the 31st is blocked", async () => {
  const { store } = fakeStore();
  for (let i = 1; i <= 30; i++) assert.deepEqual(await checkWindow(store, { ...base, key: "u1", nowMs: T0 }), { ok: true }, `search ${i}`);
  const blocked = await checkWindow(store, { ...base, key: "u1", nowMs: T0 });
  assert.deepEqual(blocked, { ok: false, retryAfterSeconds: 50 }); // 10 s into the minute -> 50 s to wait
});

test("the next minute starts from zero", async () => {
  const { store } = fakeStore();
  for (let i = 0; i < 31; i++) await checkWindow(store, { ...base, key: "u1", nowMs: T0 });
  assert.deepEqual(await checkWindow(store, { ...base, key: "u1", nowMs: T0 + 60_000 }), { ok: true });
});

test("people don't share a count", async () => {
  const { store } = fakeStore();
  for (let i = 0; i < 31; i++) await checkWindow(store, { ...base, key: "u1", nowMs: T0 });
  assert.deepEqual(await checkWindow(store, { ...base, key: "u2", nowMs: T0 }), { ok: true });
});

test("the wait is never less than one second, even at the last second of a window", async () => {
  const { store } = fakeStore();
  const lastSecond = Date.UTC(2026, 10, 24, 12, 0, 59);
  for (let i = 0; i < 30; i++) await checkWindow(store, { ...base, key: "u1", nowMs: lastSecond });
  assert.deepEqual(await checkWindow(store, { ...base, key: "u1", nowMs: lastSecond }), { ok: false, retryAfterSeconds: 1 });
});

test("counters are created with a short life, so old windows clean themselves up", async () => {
  const { store, ttls } = fakeStore();
  await checkWindow(store, { ...base, key: "u1", nowMs: T0 });
  assert.deepEqual(ttls, [70]);
});
