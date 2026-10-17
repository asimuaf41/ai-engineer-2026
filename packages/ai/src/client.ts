import Anthropic from "@anthropic-ai/sdk";

export type ClaudeClient = Anthropic;

export function createClaude({ apiKey }: { apiKey?: string } = {}): ClaudeClient {
  return new Anthropic({ apiKey });
}
