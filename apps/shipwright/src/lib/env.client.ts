// Env vars that are SAFE for the browser: only NEXT_PUBLIC_* (they ship in the JavaScript anyone can read).
// Secrets live in env.server.ts.
//
// Two ways to read them:
// - getSupabasePublicConfig(): never throws. Returns null when Supabase isn't set up. The proxy, the header and /login use this,
//   so a missing value turns sign-in off instead of taking every public page down.
// - getClientEnv(): strict. Throws a clear error (names only, never values) the first time it is called with bad values.
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Public on purpose. It is only safe because every table has Row Level Security.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

// Each name is written out in full on purpose: Next.js only swaps in NEXT_PUBLIC_ values it can see as
// `process.env.NEXT_PUBLIC_NAME`. Looping over process.env would leave them empty in the browser.
// "" counts as "not set", like in the rest of the app.
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
};

export type SupabasePublicConfig = { url: string; publishableKey: string };

const supabaseSchema = schema.pick({ NEXT_PUBLIC_SUPABASE_URL: true, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: true });

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const parsed = supabaseSchema.safeParse(raw);
  if (!parsed.success) return null;
  return { url: parsed.data.NEXT_PUBLIC_SUPABASE_URL, publishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
}

export const isSupabaseConfigured = (): boolean => getSupabasePublicConfig() !== null;

let cached: z.infer<typeof schema> | undefined;

export function getClientEnv(): z.infer<typeof schema> {
  if (cached) return cached;

  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    cached = parsed.data;
    return cached;
  }

  // CI and key-less builds set SKIP_ENV_VALIDATION=1 (same as src/env.ts): keep going with empty values.
  if (process.env.SKIP_ENV_VALIDATION) {
    return { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", NEXT_PUBLIC_SITE_URL: "" };
  }

  // Names and reasons only. The values themselves are never put in the message.
  const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid public environment variables:\n- ${problems.join("\n- ")}\nSee apps/shipwright/.env.example.`);
}
