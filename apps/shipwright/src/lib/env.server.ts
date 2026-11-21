// Env vars that must NEVER reach the browser. `server-only` makes the build fail if a client component imports this.
// Checked once, when the server first imports this module.
//
// Two kinds of settings:
// - Required (the Supabase secret key): missing = a clear error right away.
// - Optional features (GitHub App, Supabase OAuth): missing or half-filled = the feature is simply OFF.
//   The app keeps running, and the UI asks isGitHubConfigured() / isSupabaseOAuthConfigured() to show "coming soon".
import "server-only";
import { z } from "zod";

// "" counts as "not set", like in the rest of the app.
const read = (name: string): string | undefined => process.env[name] || undefined;

const STATE_SECRET = z
  .string()
  .min(43, "must be 32+ random bytes (openssl rand -base64 32)");

const coreSchema = z.object({
  // Bypasses Row Level Security. Server code only.
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const githubSchema = z.object({
  GITHUB_APP_ID: z.string().regex(/^\d+$/, "must be the numeric App ID"),
  GITHUB_APP_SLUG: z.string().min(1),
  GITHUB_APP_CLIENT_ID: z.string().min(1),
  GITHUB_APP_CLIENT_SECRET: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY_BASE64: z.string().min(1),
  OAUTH_STATE_SECRET: STATE_SECRET,
});

const supabaseOAuthSchema = z.object({
  SUPABASE_OAUTH_CLIENT_ID: z.string().min(1),
  SUPABASE_OAUTH_CLIENT_SECRET: z.string().min(1),
  OAUTH_STATE_SECRET: STATE_SECRET,
});

// The shared secret alone does not mean a feature is being set up, so it is not counted as "started".
const SHARED_KEYS = new Set(["OAUTH_STATE_SECRET"]);

function readFeature<S extends z.ZodObject>(feature: string, schema: S): z.output<S> | null {
  const keys = Object.keys(schema.shape);
  const raw = Object.fromEntries(keys.map((key) => [key, read(key)]));

  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Nothing of this feature is set: it is just off, no noise.
  if (keys.filter((key) => !SHARED_KEYS.has(key)).every((key) => raw[key] === undefined)) return null;

  // Some are set but not all (or one is wrong): stay off, and say which ones. Names only, never values.
  const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")} (${issue.message})`);
  console.warn(`[env] ${feature} is only partly configured, so it stays off. Fix: ${problems.join(", ")}`);
  return null;
}

function readCore(): z.infer<typeof coreSchema> {
  const parsed = coreSchema.safeParse({ SUPABASE_SECRET_KEY: read("SUPABASE_SECRET_KEY") });
  if (parsed.success) return parsed.data;

  // CI and key-less builds set SKIP_ENV_VALIDATION=1 (same as src/env.ts): keep going with an empty value.
  if (process.env.SKIP_ENV_VALIDATION) return { SUPABASE_SECRET_KEY: "" };

  const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid server environment variables:\n- ${problems.join("\n- ")}\nSee apps/shipwright/.env.example.`);
}

export const serverEnv = readCore();

const github = readFeature("GitHub App", githubSchema);
const supabaseOAuth = readFeature("Supabase OAuth", supabaseOAuthSchema);

// The secret that signs the "state" of OAuth round trips (see oauth-state.ts). It is shared by the GitHub and Supabase OAuth
// flows, so it can be read on its own. null = not set, or too short (a short secret is easy to guess).
const oauthStateSecret = (() => {
  const parsed = STATE_SECRET.safeParse(read("OAUTH_STATE_SECRET"));
  return parsed.success ? parsed.data : null;
})();
export const getOAuthStateSecret = (): string | null => oauthStateSecret;

export const isGitHubConfigured = (): boolean => github !== null;
export const isSupabaseOAuthConfigured = (): boolean => supabaseOAuth !== null;

// The same values, but typed: after a null check every field is a real string, not string | undefined.
export const getGitHubConfig = () => github;
export const getSupabaseOAuthConfig = () => supabaseOAuth;
