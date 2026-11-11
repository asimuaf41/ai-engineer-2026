// The contract between the Ask chat server (/api/chat tools) and its clients (web and phone).
// Plain TypeScript only. apps/shipwright/src/lib/ask/contract.check.ts fails type-checking when
// this file and the server's real tools stop matching, so a change on one side shows up on the other.
import type { Issue } from "./issue";

export type AskUITools = {
  listIssues: {
    // Always present: the server's zod schema fills in "open" when the model leaves it out.
    input: { status: "open" | "fixed" | "all" };
    output: Pick<Issue, "id" | "title" | "severity" | "status" | "file">[];
  };
  searchCode: {
    input: { query: string };
    output: { path: string; line: number; code: string }[];
  };
  runProof: {
    input: { issueId: string };
    output: { request: string; response: string; verdict: string };
  };
  openFixPR: {
    input: { issueId: string };
    output: { issueId: string; number: number; url: string };
  };
};

// ---- Daily free-question quota (public demo) ----

// How many free questions one person gets per day (the server's real limit comes from its env).
export const ASK_DEFAULT_DAILY_LIMIT = 5;
export const ASK_DAILY_LIMIT_CODE = "daily_limit";

export type AskQuota = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string; // ISO time: next UTC midnight
};

// "live" = a real Claude answer, "demo" = scripted by design, "busy-day" = scripted because the
// global daily budget ran out.
export type AskMode = "live" | "demo" | "busy-day";

// Sent by the server with every answer, so the UI can update the quota without another request.
export type AskMetadata = { quota: AskQuota; mode: AskMode };

export type AskErrorKind = "daily_limit" | "burst" | "too_long" | "network" | "other";
export type AskError = { kind: AskErrorKind; message: string; resetAt?: string };

// Turns an HTTP failure (status + JSON body, both optional) into one calm sentence. Web and phone share it,
// so both show the same words. Raw server text and URLs never reach the screen.
export function describeAskError(status: number | undefined, body: unknown): AskError {
  const data = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (status === 429 && data.code === ASK_DAILY_LIMIT_CODE) {
    return {
      kind: "daily_limit",
      message: "You've used today's free questions.",
      resetAt: typeof data.resetAt === "string" ? data.resetAt : undefined,
    };
  }
  if (status === 429) return { kind: "burst", message: "Too many questions at once. Try again in a few minutes." };
  if (status === 413) return { kind: "too_long", message: "That question is too long." };
  if (status === undefined) return { kind: "network", message: "Can't reach Shipwright. Check your connection." };
  return { kind: "other", message: "Shipwright couldn't answer. Try again." };
}

// Same as describeAskError, for a raw response body string (what the AI SDK keeps on its error). Web and phone both
// call this, so the JSON parsing isn't copied between the apps.
export function describeAskResponse(status: number | undefined, rawBody: string | undefined): AskError {
  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : undefined;
  } catch {
    body = undefined; // not JSON (a proxy error page, say): the status code alone is enough
  }
  return describeAskError(status, body);
}

// "7h 12m" until a reset time (never negative). Pure, so both apps format it the same.
export function formatResetIn(resetAt: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.ceil((Date.parse(resetAt) - now) / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export const ASK_SUGGESTIONS = [
  "Is my app safe to launch?",
  "What should I fix first?",
  "Did any secrets leak?",
  "Fix it: open a pull request",
] as const;
