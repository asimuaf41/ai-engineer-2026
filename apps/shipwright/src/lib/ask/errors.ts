// Turns whatever useChat gives us into one of our calm, shared error messages.
// (No "server-only": this runs in the browser.)
import { describeAskError, describeAskResponse } from "@repo/ai/shared";
import type { AskError } from "@repo/ai/shared";
import { APICallError } from "ai";

export function parseAskError(error: unknown): AskError {
  if (APICallError.isInstance(error)) return describeAskResponse(error.statusCode, error.responseBody);
  // fetch() itself failed (offline, server unreachable): there is no HTTP status at all.
  if (error instanceof TypeError) return describeAskError(undefined, undefined);
  return describeAskError(500, undefined);
}
