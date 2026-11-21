// Connections to outside services (GitHub, Supabase) and their tokens. Server only.
//
// The tokens live in Supabase Vault. They are written and read ONLY through four database functions in the `server` schema,
// which only the secret key (the admin client) may run. Every call names the organization too, and the database refuses a
// connection that belongs to a different one. Nothing here ever logs or throws a token: errors carry only a database code.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConnectionProvider = "github_app" | "supabase_oauth";
export type ConnectionStatus = "active" | "error";

// A failed database call. `code` is a short database code (for example "P0002"); the message never contains a secret.
export class ConnectionError extends Error {
  code: string;

  constructor(operation: string, code: string | undefined) {
    super(`Connection ${operation} failed (code ${code ?? "unknown"})`);
    this.name = "ConnectionError";
    this.code = code ?? "unknown";
  }
}

const server = () => createAdminClient().schema("server");

// Creates or updates the one connection of this organization and provider. With `secret`, the token is stored (or replaced,
// keeping the same Vault entry). `appId` links the connection to an app of the same organization. Returns the connection id.
export async function saveConnection(input: {
  orgId: string;
  provider: ConnectionProvider;
  externalId: string;
  secret?: string;
  appId?: string;
  actorId?: string;
}): Promise<string> {
  const { data, error } = await server().rpc("save_connection", {
    p_org_id: input.orgId,
    p_provider: input.provider,
    p_external_id: input.externalId,
    p_secret: input.secret,
    p_app_id: input.appId,
    p_actor_id: input.actorId,
  });
  if (error || typeof data !== "string") {
    console.warn(`[connections] save failed: code=${error?.code ?? "unknown"} provider=${input.provider}`);
    throw new ConnectionError("save", error?.code);
  }
  return data;
}

// The decrypted token, or null when there is none (or the connection belongs to another organization).
export async function readConnectionSecret(orgId: string, connectionId: string): Promise<string | null> {
  const { data, error } = await server().rpc("read_connection_secret", { p_org_id: orgId, p_connection_id: connectionId });
  if (error) {
    console.warn(`[connections] read failed: code=${error.code} connection=${connectionId}`);
    throw new ConnectionError("read", error.code);
  }
  return typeof data === "string" ? data : null;
}

// Disconnects: the token is deleted from Vault and the connection row is removed. false = nothing matched.
export async function revokeConnection(orgId: string, connectionId: string): Promise<boolean> {
  const { data, error } = await server().rpc("revoke_connection", { p_org_id: orgId, p_connection_id: connectionId });
  if (error) {
    console.warn(`[connections] revoke failed: code=${error.code} connection=${connectionId}`);
    throw new ConnectionError("revoke", error.code);
  }
  return data === true;
}

// Marks a connection healthy ("active") or broken ("error", for example when a token can no longer be refreshed).
export async function setConnectionStatus(orgId: string, connectionId: string, status: ConnectionStatus): Promise<boolean> {
  const { data, error } = await server().rpc("set_connection_status", { p_org_id: orgId, p_connection_id: connectionId, p_status: status });
  if (error) {
    console.warn(`[connections] status change failed: code=${error.code} connection=${connectionId}`);
    throw new ConnectionError("status change", error.code);
  }
  return data === true;
}
