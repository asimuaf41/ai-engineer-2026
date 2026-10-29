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
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
