// The daily free-question quota for the public demo.
//  - Each visitor gets DEMO_DAILY_LIMIT questions per UTC day (default 5).
//  - Everyone together gets DEMO_GLOBAL_DAILY_LIMIT live Claude answers per day (default 300). After that,
//    answers come from the scripted demo, so the app never looks broken and the API key never runs away.
// Counts live in Upstash Redis (exact across all Vercel servers). Without Redis we count in memory:
// fine for local dev, but each server instance counts on its own, so in production we answer from the
// script instead (see `live` below).
import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { AskMode, AskQuota } from "@repo/ai/shared";
import { env } from "@/env";

const TWO_DAYS_SECONDS = 2 * 24 * 60 * 60;

type Store = {
  get(key: string): Promise<number>;
  // Adds 1 and returns the new total.
  incr(key: string): Promise<number>;
  // True when the key exists.
  has(key: string): Promise<boolean>;
  // Remembers a key for two days.
  mark(key: string): Promise<void>;
};

function memoryStore(): Store {
  const values = new Map<string, { value: number; expiresAt: number }>();
  const live = (key: string) => {
    const entry = values.get(key);
    if (entry && entry.expiresAt <= Date.now()) values.delete(key);
    return values.get(key);
  };
  return {
    async get(key) {
      return live(key)?.value ?? 0;
    },
    async incr(key) {
      const entry = live(key) ?? { value: 0, expiresAt: Date.now() + TWO_DAYS_SECONDS * 1000 };
      entry.value += 1;
      values.set(key, entry);
      return entry.value;
    },
    async has(key) {
      return live(key) !== undefined;
    },
    async mark(key) {
      values.set(key, { value: 1, expiresAt: Date.now() + TWO_DAYS_SECONDS * 1000 });
    },
  };
}

function redisStore(redis: Redis): Store {
  return {
    async get(key) {
      return (await redis.get<number>(key)) ?? 0;
    },
    async incr(key) {
      const value = await redis.incr(key);
      // Every key carries the date, so a missed expiry only wastes a few bytes. Still, tidy up.
      if (value === 1) await redis.expire(key, TWO_DAYS_SECONDS);
      return value;
    },
    async has(key) {
      return (await redis.exists(key)) === 1;
    },
    async mark(key) {
      await redis.set(key, 1, { ex: TWO_DAYS_SECONDS });
    },
  };
}

const redisUrl = env.UPSTASH_REDIS_REST_URL;
const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = Boolean(redisUrl && redisToken);
const isProduction = process.env.NODE_ENV === "production";

let store: Store | undefined;
function getStore(): Store {
  if (store) return store;
  if (redisUrl && redisToken) {
    store = redisStore(new Redis({ url: redisUrl, token: redisToken }));
  } else {
    console.warn(
      isProduction
        ? "[quota] PRODUCTION WITHOUT UPSTASH REDIS: answers are scripted only, because memory counters can't protect the API key. Add the Upstash integration in Vercel."
        : "[quota] No Upstash Redis configured: counting in memory (loose limit, fine for local dev).",
    );
    store = memoryStore();
  }
  return store;
}

const utcDay = () => new Date().toISOString().slice(0, 10);
const nextUtcMidnight = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
};

// Which visitor is this? Vercel sets x-vercel-forwarded-for itself (a client can't fake it).
export function clientIp(req: Request): string {
  const headers = req.headers;
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  // In production only Vercel's own header is trusted: the others can be set by the caller, who could then get
  // a fresh quota on every request. Anyone else shares one strict "unknown" visitor.
  if (isProduction) return "unknown";
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// We only ever keep a salted hash, never the raw IP.
export function visitorKey(ip: string): string {
  return createHash("sha256").update(`${env.QUOTA_SALT ?? "dev-only-salt"}:${ip}`).digest("hex").slice(0, 32);
}

function toQuota(used: number): AskQuota {
  const limit = env.DEMO_DAILY_LIMIT;
  return { used: Math.min(used, limit), limit, remaining: Math.max(0, limit - used), resetAt: nextUtcMidnight() };
}

export async function getQuota(visitor: string): Promise<AskQuota> {
  return toQuota(await getStore().get(`q:used:${utcDay()}:${visitor}`));
}

export type SpendResult = { allowed: true; quota: AskQuota; mode: AskMode } | { allowed: false; quota: AskQuota };

// Free repeats per day (Retry, and the follow-up after Approve/Deny). Bigger than the question limit, because one
// question can need a few repeats, but still a cap so a repeat can't be used to ask for free forever.
const REPEAT_LIMIT_FACTOR = 4;

// Called once per chat request, before any model work. `fingerprintSource` is the newest user message's id AND text.
//  - A NEW message costs one question. Only a message that was ALLOWED is remembered.
//  - The same message again (same id and same text) is a repeat: free, up to the repeat cap.
//  - A blocked question is never remembered, so sending it again is blocked again.
export async function spendQuestion(visitor: string, fingerprintSource: string): Promise<SpendResult> {
  const day = utcDay();
  // Without Redis in production the counters are per server and can't protect the key: scripted answers only.
  const live = env.SHIPWRIGHT_AI_MODE === "live" && Boolean(env.ANTHROPIC_API_KEY) && (hasRedis || !isProduction);
  // Hashed, so a huge or odd message id can't create huge Redis keys, and a reused id with new text is a new question.
  const fingerprint = createHash("sha256").update(fingerprintSource).digest("hex").slice(0, 32);
  try {
    const db = getStore();
    const okKey = `q:ok:${day}:${visitor}:${fingerprint}`;
    if (await db.has(okKey)) {
      if ((await db.incr(`q:repeat:${day}:${visitor}`)) > env.DEMO_DAILY_LIMIT * REPEAT_LIMIT_FACTOR) {
        return { allowed: false, quota: await getQuota(visitor) };
      }
    } else {
      const used = await db.incr(`q:used:${day}:${visitor}`);
      if (used > env.DEMO_DAILY_LIMIT) return { allowed: false, quota: toQuota(used) };
      await db.mark(okKey);
    }
    const quota = await getQuota(visitor);
    if (!live) return { allowed: true, quota, mode: "demo" };
    const globalUsed = await db.incr(`q:global:${day}`);
    return { allowed: true, quota, mode: globalUsed > env.DEMO_GLOBAL_DAILY_LIMIT ? "busy-day" : "live" };
  } catch (error) {
    // If Redis is down we must not leave the API key unprotected, and we must not break the demo either:
    // answer from the script. The error is logged for us to fix.
    console.error("[quota] counter unavailable, serving the scripted answer", error);
    return { allowed: true, quota: toQuota(0), mode: "busy-day" };
  }
}
