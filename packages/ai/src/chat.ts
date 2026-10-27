import { createAnthropic } from "@ai-sdk/anthropic";
import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { MODELS } from "./models";

export function createChatModel({ apiKey }: { apiKey: string }) {
  return createAnthropic({ apiKey })(MODELS.chat);
}

// Sonnet 5.5 always thinks. "summarized" streams a short summary so the UI can show it
// (without it, thinking arrives empty). Low effort = faster first token.
export const CHAT_PROVIDER_OPTIONS = {
  anthropic: {
    thinking: { type: "adaptive", display: "summarized" },
    effort: "low",
  } satisfies AnthropicLanguageModelOptions,
};
