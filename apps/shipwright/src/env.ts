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
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  runtimeEnv: {
    SHIPWRIGHT_AI_MODE: process.env.SHIPWRIGHT_AI_MODE,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
