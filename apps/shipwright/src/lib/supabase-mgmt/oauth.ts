// oauth-core.ts with our real settings filled in (client id and secret from the server settings, our callback address).
import "server-only";
import { getClientEnv } from "@/lib/env.client";
import { getSupabaseOAuthConfig } from "@/lib/env.server";
import { buildAuthorizeUrl, exchangeCode, refreshTokens, type OAuthClient } from "@/lib/supabase-mgmt/oauth-core";
import type { TokenSet } from "@/lib/supabase-mgmt/token-set";

function getClient(): OAuthClient {
  const config = getSupabaseOAuthConfig();
  // Callers check isSupabaseOAuthConfigured() first. This is the safety net.
  if (!config) throw new Error("Supabase OAuth is not configured. See apps/shipwright/.env.example.");
  return {
    clientId: config.SUPABASE_OAUTH_CLIENT_ID,
    clientSecret: config.SUPABASE_OAUTH_CLIENT_SECRET,
    // NEXT_PUBLIC_SITE_URL must be the site's ORIGIN (https://example.com), with no sub-path. The address must match,
    // letter for letter, the redirect URI registered on the Supabase OAuth app.
    redirectUri: new URL("/api/supabase/callback", getClientEnv().NEXT_PUBLIC_SITE_URL).toString(),
  };
}

export function supabaseAuthorizeUrl(state: string, challenge: string): string {
  const { clientId, redirectUri } = getClient();
  return buildAuthorizeUrl({ clientId, redirectUri, state, challenge });
}

export const exchangeSupabaseCode = (code: string, verifier: string): Promise<TokenSet> => exchangeCode(getClient(), { code, verifier });

export const refreshSupabaseTokens = (refreshToken: string): Promise<TokenSet> => refreshTokens(getClient(), refreshToken);
