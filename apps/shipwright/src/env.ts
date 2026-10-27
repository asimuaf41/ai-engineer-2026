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
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    SHIPWRIGHT_AI_MODE: process.env.SHIPWRIGHT_AI_MODE,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TOOL_APPROVAL_SECRET: process.env.TOOL_APPROVAL_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
