// A fake model that plays a script instead of calling Claude.
// Use it for UI work, demos and tests without an API key.
// streamText treats it like Claude, and real tools still run.
import type { LanguageModelV4, LanguageModelV4CallOptions, LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";

export type ScriptPart = LanguageModelV4StreamPart;
export type Script = (options: LanguageModelV4CallOptions) => ScriptPart[];

export function createScriptedModel(
  script: Script,
  { chunkDelayInMs = 30 }: { chunkDelayInMs?: number } = {},
): LanguageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "scripted",
    modelId: "scripted-demo",
    supportedUrls: {},
    doGenerate: async () => {
      throw new Error("The scripted model only supports streaming.");
    },
    doStream: async (options) => ({
      stream: simulateReadableStream({
        chunks: script(options),
        initialDelayInMs: 400,
        chunkDelayInMs,
      }),
    }),
  };
}

const WORDS = /\S+\s*|\s+/g;

export function reasoning(id: string, value: string): ScriptPart[] {
  return [
    { type: "reasoning-start", id },
    ...(value.match(WORDS) ?? []).map((delta) => ({ type: "reasoning-delta" as const, id, delta })),
    { type: "reasoning-end", id },
  ];
}

export function text(id: string, value: string): ScriptPart[] {
  return [
    { type: "text-start", id },
    ...(value.match(WORDS) ?? []).map((delta) => ({ type: "text-delta" as const, id, delta })),
    { type: "text-end", id },
  ];
}

export function toolCall(toolCallId: string, toolName: string, input: unknown): ScriptPart[] {
  const json = JSON.stringify(input);
  const pieces = json.match(/[\s\S]{1,8}/g) ?? [];
  return [
    { type: "tool-input-start", id: toolCallId, toolName },
    ...pieces.map((delta) => ({ type: "tool-input-delta" as const, id: toolCallId, delta })),
    { type: "tool-input-end", id: toolCallId },
    { type: "tool-call", toolCallId, toolName, input: json },
  ];
}

export function finish(reason: "stop" | "tool-calls"): ScriptPart {
  return {
    type: "finish",
    finishReason: { unified: reason, raw: reason },
    usage: {
      inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 0, text: 0, reasoning: 0 },
    },
  };
}
