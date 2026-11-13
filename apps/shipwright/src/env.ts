import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // "demo" plays scripted replies with no key; "live" calls Claude through @repo/ai.
    SHIPWRIGHT_AI_MODE: z.enum(["demo", "live"]).default("demo"),
    ANTHROPIC_API_KEY: z
      .string()
      .startsWith("sk-ant-", 'ANTHROPIC_API_KEY must start with "sk-ant-".')
      .optional(),
    // Signs tool approvals so a modified browser can't fake an "Approve" click.
    // Generate one with: openssl rand -base64 32
    TOOL_APPROVAL_SECRET: z.string().min(32, "TOOL_APPROVAL_SECRET should be at least 32 characters"),
    // Daily free-question quota. Upstash Redis keeps exact counts across servers; without it we fall back
    // to memory (fine for local dev, loose on Vercel).
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    // Mixed into the hash of each visitor's IP, so raw IPs are never stored. Generate: openssl rand -base64 32
    QUOTA_SALT: z.string().min(16, "QUOTA_SALT should be at least 16 characters").optional(),
    // Free questions per person per day, and live answers for everyone per day. Past the global number,
    // everyone gets the scripted demo answer instead of a real one.
    DEMO_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
    DEMO_GLOBAL_DAILY_LIMIT: z.coerce.number().int().positive().default(300),
    // Set by Vercel (the production domain without "https://"). lib/site.ts uses it when NEXT_PUBLIC_APP_URL is unset.
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },
  client: {
    // Optional: lib/site.ts falls back to the Vercel domain, then to localhost.
    NEXT_PUBLIC_APP_URL: z.url().optional(),
  },
  runtimeEnv: {
    SHIPWRIGHT_AI_MODE: process.env.SHIPWRIGHT_AI_MODE,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TOOL_APPROVAL_SECRET: process.env.TOOL_APPROVAL_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    QUOTA_SALT: process.env.QUOTA_SALT,
    DEMO_DAILY_LIMIT: process.env.DEMO_DAILY_LIMIT,
    DEMO_GLOBAL_DAILY_LIMIT: process.env.DEMO_GLOBAL_DAILY_LIMIT,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
