// Talking to Supabase's OAuth server: build the sign-in link, swap a code for tokens, and renew tokens.
// Pure code: the network call (`fetch`) can be swapped, so tests use a pretend Supabase. oauth.ts gives it the real settings.
//
// Safety rules in here:
// - Nothing is ever logged, and we never read the body of a FAILED answer, so an error cannot carry a secret.
// - The host is fixed (api.supabase.com). Nothing from a user can change where we send the client secret.
import { z } from "zod";
import { SupabaseOAuthError } from "./errors.ts";
import { tokenSetFromResponse, type TokenSet } from "./token-set.ts";

export const SUPABASE_API = "https://api.supabase.com";
export const REQUEST_TIMEOUT_MS = 10_000;

export type OAuthClient = {
  clientId: string;
  clientSecret: string;
  // The page Supabase sends the person back to. It must be EXACTLY the same in the sign-in link and in the code swap.
  redirectUri: string;
  fetch?: typeof fetch;
};

// The link to send the person to. No `scope`: it is deprecated, the scopes are fixed when the OAuth app is created.
export function buildAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string }): string {
  const url = new URL("/v1/oauth/authorize", SUPABASE_API);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  // How long the access token lives, in seconds, as Supabase says. We never assume a number.
  expires_in: z.number().int().positive(),
});

async function postToken(client: OAuthClient, params: Record<string, string>, previousRefreshToken: string | undefined, now?: number): Promise<TokenSet> {
  const send = client.fetch ?? fetch;
  // Exactly as Supabase's guide shows it: base64 of "client_id:client_secret". (Supabase client ids are plain UUIDs.)
  const basic = Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await send(`${SUPABASE_API}/v1/oauth/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams(params).toString(),
      cache: "no-store",
      // A hung Supabase must not hang our sign-in page.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // No connection, or it timed out. 504 = "the other side did not answer". (The thrown error is dropped on purpose.)
    throw new SupabaseOAuthError(504);
  }

  // A refusal carries only its status. We do not even read the body.
  if (!response.ok) throw new SupabaseOAuthError(response.status);

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new SupabaseOAuthError(502);
  }
  const parsed = tokenResponseSchema.safeParse(json);
  if (!parsed.success) throw new SupabaseOAuthError(502);

  const set = tokenSetFromResponse(parsed.data, previousRefreshToken, now);
  if (!set) throw new SupabaseOAuthError(502);
  return set;
}

// Swaps the one-time code (plus the PKCE verifier) for the first token set.
export function exchangeCode(client: OAuthClient, input: { code: string; verifier: string }, now?: number): Promise<TokenSet> {
  return postToken(
    client,
    { grant_type: "authorization_code", code: input.code, redirect_uri: client.redirectUri, code_verifier: input.verifier },
    undefined,
    now,
  );
}

// Trades the refresh token for a fresh token set. If Supabase sends a NEW refresh token, the caller must save it right away.
export function refreshTokens(client: OAuthClient, refreshToken: string, now?: number): Promise<TokenSet> {
  return postToken(client, { grant_type: "refresh_token", refresh_token: refreshToken }, refreshToken, now);
}
