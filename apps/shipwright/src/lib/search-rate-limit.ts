// 30 code searches per signed-in person per minute. Server only.
// Counters live in Upstash Redis when it is configured (exact across all servers, same settings as the daily quota in quota.ts).
// Without Redis we count in memory: fine for local dev, looser on Vercel (each server instance counts on its own).
// If Redis is configured but fails, we do NOT let searches through unlimited (each one costs an embedding call): we fall back
// to the memory counter, which still caps each server instance.
import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { checkWindow, type CounterStore, type WindowResult } from "@/lib/rate-limit-core";

export const SEARCHES_PER_MINUTE = 30;
const MAX_MEMORY_KEYS = 10_000; // a flood of different people can't grow the map for ever

function memoryStore(): CounterStore {
  const values = new Map<string, { value: number; expiresAt: number }>();
  return {
    async incr(key, ttlSeconds) {
      const now = Date.now();
      // Forget finished windows, and if it is still too big (a flood inside one window) the oldest entries first.
      for (const [name, entry] of values) if (entry.expiresAt <= now) values.delete(name);
      for (const oldest of values.keys()) {
        if (values.size < MAX_MEMORY_KEYS) break;
        values.delete(oldest);
      }
      const entry = values.get(key) ?? { value: 0, expiresAt: now + ttlSeconds * 1000 };
      entry.value += 1;
      values.set(key, entry);
      return entry.value;
    },
  };
}

function redisStore(redis: Redis): CounterStore {
  return {
    async incr(key, ttlSeconds) {
      const value = await redis.incr(key);
      if (value === 1) await redis.expire(key, ttlSeconds);
      return value;
    },
  };
}

const local = memoryStore();
let shared: CounterStore | undefined;
function getShared(): CounterStore | null {
  if (shared) return shared;
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  shared = redisStore(new Redis({ url, token }));
  return shared;
}

export async function allowSearch(userId: string): Promise<WindowResult> {
  const input = { key: `rl:search:${userId}`, limit: SEARCHES_PER_MINUTE, windowSeconds: 60, nowMs: Date.now() };
  const redis = getShared();
  if (redis) {
    try {
      return await checkWindow(redis, input);
    } catch {
      console.warn("[search] rate limit store unavailable, using the per-server counter");
    }
  }
  return checkWindow(local, input);
}
