import "server-only";

import { createClaude } from "@repo/ai/client";
import { env } from "@/env";

// server-only makes this module fail the build if anything in a client bundle
// ever imports it — the only thing standing between ANTHROPIC_API_KEY and the browser.
export const claude = createClaude({ apiKey: env.ANTHROPIC_API_KEY });
