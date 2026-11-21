// The "state" of an OAuth-style round trip (sign in with GitHub, install a GitHub App, ...), without any Next.js code, so it is easy to test.
//
// Why it exists: when we send a person to GitHub and they come back, anyone could open our callback URL with made-up values.
// "state" proves that THIS browser started THIS flow, for THIS organization, a few minutes ago:
//   1. We make a random nonce and put it in the URL we send them to.
//   2. We also keep a signed copy in a cookie (nonce, org, provider, expiry). Only we can sign it (HMAC with a secret).
//   3. On the way back we check the signature, the expiry, the provider, and that the cookie's nonce equals the URL's nonce.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "github" | "supabase";

export type StatePayload = {
  nonce: string;
  orgId: string;
  provider: OAuthProvider;
  // Small extra facts we want back, such as the org slug. Strings only.
  extra: Record<string, string>;
  // Seconds since 1970.
  expiresAt: number;
};

export const STATE_TTL_SECONDS = 10 * 60;

export type StateFailure = "malformed" | "bad_signature" | "expired" | "provider" | "mismatch";
export type VerifyResult = { ok: true; payload: StatePayload } | { ok: false; reason: StateFailure };

// A random value nobody can guess (32 random bytes, 43 characters).
export const newNonce = (): string => randomBytes(32).toString("base64url");

// Compares two strings without leaking, through timing, how many leading characters matched.
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const mac = (body: string, secret: string): string => createHmac("sha256", secret).update(body).digest("base64url");

// "<payload>.<signature>", both base64url, so it is safe to put in a cookie.
export function signPayload(payload: StatePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

function parsePayload(body: string): StatePayload | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof value !== "object" || value === null) return null;
    const { nonce, orgId, provider, extra, expiresAt } = value as Record<string, unknown>;
    if (typeof nonce !== "string" || typeof orgId !== "string" || typeof expiresAt !== "number") return null;
    if (provider !== "github" && provider !== "supabase") return null;
    if (typeof extra !== "object" || extra === null || Array.isArray(extra)) return null;
    const entries = Object.entries(extra);
    if (!entries.every(([, v]) => typeof v === "string")) return null;
    return { nonce, orgId, provider, extra: Object.fromEntries(entries) as Record<string, string>, expiresAt };
  } catch {
    return null;
  }
}

// The shape of an org slug (the same rule the database enforces). Anything else is not a slug.
const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const safeSlug = (value: unknown): string | undefined => (typeof value === "string" && SLUG.test(value) ? value : undefined);

// Reads the payload WITHOUT checking the signature. Never trust the result for anything that matters.
// It is only used to choose where to send a person after a failure (and that page runs its own access check).
export function decodeUnverified(token: string | undefined): StatePayload | null {
  const [body] = token?.split(".") ?? [];
  return body ? parsePayload(body) : null;
}

export function verifyPayload(
  token: string | undefined,
  options: { secret: string; provider: OAuthProvider; stateFromUrl: string; now?: number },
): VerifyResult {
  const parts = token?.split(".") ?? [];
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [body, signature] = parts;

  // The signature first: until it is right, nothing inside the payload can be believed.
  if (!safeEqual(signature, mac(body, options.secret))) return { ok: false, reason: "bad_signature" };

  const payload = parsePayload(body);
  if (!payload) return { ok: false, reason: "malformed" };
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (payload.expiresAt <= now) return { ok: false, reason: "expired" };
  if (payload.provider !== options.provider) return { ok: false, reason: "provider" };
  if (!safeEqual(payload.nonce, options.stateFromUrl)) return { ok: false, reason: "mismatch" };
  return { ok: true, payload };
}
