// Using a saved Supabase connection: get a valid access token, and call the Management API with it.
// getAccessToken() is the ONLY place that renews tokens, so there is one rule for it:
//   - if the token has 2 minutes or less left, renew it and save the NEW token set at once (the refresh token may rotate:
//     the old one can stop working the moment the new one is issued);
//   - if Supabase refuses the refresh (access was revoked, or the refresh token is dead), mark the connection 'error' and
//     report "needs reconnect", so the person is asked to connect again instead of seeing a mysterious failure.
// Nothing here logs a token, a response, or a URL: only a status and the connection id.
import "server-only";
import { readConnectionSecret, saveConnection, setConnectionStatus } from "@/lib/connections";
import { listProjects, type SupabaseProject } from "@/lib/supabase-mgmt/api";
import { MgmtApiError, NeedsReconnectError, SupabaseOAuthError } from "@/lib/supabase-mgmt/errors";
import { refreshSupabaseTokens } from "@/lib/supabase-mgmt/oauth";
import { needsRefresh, parseTokenSet, serializeTokenSet, type TokenSet } from "@/lib/supabase-mgmt/token-set";

// What we need to know about a connection (read with the signed-in user, so it holds no secret).
export type SupabaseConnection = { id: string; orgId: string; externalId: string };

// Day 19: two refreshes at the same moment could race (both use the same refresh token and one of them loses it).
// A durable background job will own refreshes then. Until then a loser sees "needs reconnect" at worst, never a wrong token.
async function refreshAndSave(connection: SupabaseConnection, current: TokenSet): Promise<TokenSet> {
  try {
    const next = await refreshSupabaseTokens(current.refresh_token);
    // Saved immediately, in the SAME Vault entry (a refresh replaces the old token set).
    await saveConnection({ orgId: connection.orgId, provider: "supabase_oauth", externalId: connection.externalId, secret: serializeTokenSet(next) });
    return next;
  } catch (error) {
    if (error instanceof SupabaseOAuthError && error.kind === "invalid_grant") {
      console.warn(`[supabase] refresh refused (status ${error.status}) connection=${connection.id}`);
      await setConnectionStatus(connection.orgId, connection.id, "error");
      throw new NeedsReconnectError();
    }
    throw error;
  }
}

async function loadTokenSet(connection: SupabaseConnection): Promise<TokenSet> {
  const stored = await readConnectionSecret(connection.orgId, connection.id);
  const set = stored ? parseTokenSet(stored) : null;
  if (!set) {
    await setConnectionStatus(connection.orgId, connection.id, "error");
    throw new NeedsReconnectError();
  }
  return set;
}

// A token that is good for at least the next 2 minutes.
export async function getAccessToken(connection: SupabaseConnection): Promise<string> {
  const set = await loadTokenSet(connection);
  return needsRefresh(set) ? (await refreshAndSave(connection, set)).access_token : set.access_token;
}

// Runs `call` with a good token. If Supabase answers 401 (the token was revoked or expired early), renew once and retry once.
export async function withSupabaseToken<T>(connection: SupabaseConnection, call: (accessToken: string) => Promise<T>): Promise<T> {
  const set = await loadTokenSet(connection);
  const token = needsRefresh(set) ? (await refreshAndSave(connection, set)).access_token : set.access_token;
  try {
    return await call(token);
  } catch (error) {
    if (!(error instanceof MgmtApiError) || error.status !== 401) throw error;
    const renewed = await refreshAndSave(connection, set);
    try {
      return await call(renewed.access_token);
    } catch (second) {
      if (second instanceof MgmtApiError && second.status === 401) {
        await setConnectionStatus(connection.orgId, connection.id, "error");
        throw new NeedsReconnectError();
      }
      throw second;
    }
  }
}

export const listSupabaseProjects = (connection: SupabaseConnection): Promise<SupabaseProject[]> => withSupabaseToken(connection, (token) => listProjects(token));
