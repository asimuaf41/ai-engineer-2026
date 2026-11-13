import { describeAskError, describeAskResponse } from "@repo/ai/shared";
import type { AskError, AskMetadata, AskQuota, AskUITools } from "@repo/ai/shared";
import { APICallError, DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import Constants from "expo-constants";
import { fetch as expoFetch } from "expo/fetch";
import { apiUrl } from "@/lib/api-url";

export type AskMessage = UIMessage<AskMetadata, never, AskUITools>;

const clientName = () => `mobile/${Constants.expoConfig?.version ?? "unknown"}`;

export function createAskTransport() {
  return new DefaultChatTransport<AskMessage>({
    api: apiUrl("/api/chat"),
    // React Native's own fetch can't stream a response; expo/fetch can.
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    // Day 26 adds the Authorization header here.
    headers: () => ({ "x-shipwright-client": clientName() }),
  });
}

// Turns any failure into one of the shared, calm messages. Raw error text and URLs never reach the screen.
export function parseAskError(error: unknown): AskError {
  if (APICallError.isInstance(error)) return describeAskResponse(error.statusCode, error.responseBody);
  if (error instanceof Error && /network|fetch|connect|offline|timed out/i.test(error.message)) {
    return describeAskError(undefined, undefined);
  }
  return describeAskError(500, undefined);
}

// Reads how many free questions are left today.
export async function fetchQuota(): Promise<AskQuota | undefined> {
  const response = await expoFetch(apiUrl("/api/quota"), {
    headers: { "x-shipwright-client": clientName() },
  });
  return response.ok ? ((await response.json()) as AskQuota) : undefined;
}
