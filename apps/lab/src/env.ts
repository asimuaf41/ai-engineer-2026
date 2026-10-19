import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    ANTHROPIC_API_KEY: z
      .string()
      .startsWith("sk-ant-", "ANTHROPIC_API_KEY must start with sk-ant- — check you copied the real key."),
  },
  runtimeEnv: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
