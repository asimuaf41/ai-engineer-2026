// Cookie side of the OAuth "state" (the signing and checking lives in oauth-state-core.ts).
// createState() before sending a person to GitHub; readState() when they come back. The cookie can be used ONCE.
import "server-only";
import { cookies } from "next/headers";
import { getOAuthStateSecret } from "@/lib/env.server";
import {
  decodeUnverified,
  newNonce,
  safeSlug,
  signPayload,
  STATE_TTL_SECONDS,
  verifyPayload,
  type OAuthProvider,
  type StateFailure,
} from "@/lib/oauth-state-core";

const cookieName = (provider: OAuthProvider) => `sw_oauth_state_${provider}`;
// Only our /api routes (the callbacks) ever need it, so the browser sends it nowhere else.
const COOKIE_PATH = "/api";
// Note: cookies can only be written in Route Handlers and Server Actions. Call these two functions from there, never from a page.

// Returns the nonce to put in the URL (?state=...). The signed copy goes in a cookie.
export async function createState(input: {
  orgId: string;
  provider: OAuthProvider;
  extra?: Record<string, string>;
}): Promise<string> {
  const secret = getOAuthStateSecret();
  if (!secret) throw new Error("OAUTH_STATE_SECRET is not set (32+ random bytes). See apps/shipwright/.env.example.");

  const nonce = newNonce();
  const token = signPayload(
    {
      nonce,
      orgId: input.orgId,
      provider: input.provider,
      extra: input.extra ?? {},
      expiresAt: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
    },
    secret,
  );
  const store = await cookies();
  store.set(cookieName(input.provider), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_TTL_SECONDS,
    path: COOKIE_PATH,
  });
  return nonce;
}

export type ReadStateResult =
  | { ok: true; orgId: string; extra: Record<string, string> }
  // `slug` on a failure is UNVERIFIED (it is read from a cookie we could not trust). Use it only to pick a page to send the
  // person back to; that page checks access on its own.
  | { ok: false; reason: StateFailure | "no_cookie" | "not_configured"; slug?: string };

export async function readState(provider: OAuthProvider, stateFromUrl: string | null | undefined): Promise<ReadStateResult> {
  const store = await cookies();
  const token = store.get(cookieName(provider))?.value;
  // One use: whatever happens next, this cookie is gone, so a repeated or replayed callback finds nothing.
  if (token !== undefined) store.set(cookieName(provider), "", { path: COOKIE_PATH, maxAge: 0 });

  const secret = getOAuthStateSecret();
  if (!secret) return { ok: false, reason: "not_configured" };
  if (token === undefined) return { ok: false, reason: "no_cookie" };

  const result = verifyPayload(token, { secret, provider, stateFromUrl: stateFromUrl ?? "" });
  if (result.ok) return { ok: true, orgId: result.payload.orgId, extra: result.payload.extra };

  return { ok: false, reason: result.reason, slug: safeSlug(decodeUnverified(token)?.extra.slug) };
}
