// Errors from the Supabase OAuth and Management API calls. They carry ONLY a status number, never a response body,
// a token, a code or a URL, so printing one to a log can never leak a secret.
// (Plain fields, not constructor shortcuts: Node's test runner can only strip simple TypeScript.)

export type OAuthErrorKind = "invalid_grant" | "rate_limited" | "failed";

// Failure at the token endpoint (swapping a code, or refreshing).
export class SupabaseOAuthError extends Error {
  status: number;
  kind: OAuthErrorKind;

  constructor(status: number) {
    super(`Supabase OAuth request failed with status ${status}`);
    this.name = "SupabaseOAuthError";
    this.status = status;
    // A refused code or refresh token (400 or 401) means the person must connect again.
    this.kind = status === 400 || status === 401 ? "invalid_grant" : status === 429 ? "rate_limited" : "failed";
  }
}

// Failure calling the Management API (listing organizations or projects).
export class MgmtApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`Supabase API request failed with status ${status}`);
    this.name = "MgmtApiError";
    this.status = status;
  }
}

// The saved connection can no longer be used (the person revoked access, or the refresh token was refused).
export class NeedsReconnectError extends Error {
  constructor() {
    super("The Supabase connection must be authorized again.");
    this.name = "NeedsReconnectError";
  }
}

const MESSAGES = {
  reconnect: "Shipwright's access to your Supabase account has ended. Please connect Supabase again.",
  rateLimited: "Supabase is limiting requests right now. Wait a minute, then try again.",
  generic: "Something went wrong talking to Supabase. Please try again.",
} as const;

// Plain English for the person, from any of the errors above.
export function explainSupabaseError(error: unknown): string {
  if (error instanceof NeedsReconnectError) return MESSAGES.reconnect;
  if (error instanceof SupabaseOAuthError) {
    return error.kind === "invalid_grant" ? MESSAGES.reconnect : error.kind === "rate_limited" ? MESSAGES.rateLimited : MESSAGES.generic;
  }
  if (error instanceof MgmtApiError) {
    return error.status === 401 || error.status === 403 ? MESSAGES.reconnect : error.status === 429 ? MESSAGES.rateLimited : MESSAGES.generic;
  }
  return MESSAGES.generic;
}
