import type Anthropic from "@anthropic-ai/sdk";
import type { ClaudeClient } from "./client";
import { MODELS } from "./models";

export type SourceFiles = Record<string, string>;

export interface AuditOptions {
  onLog?: (line: string) => void;
}

export interface AuditResult {
  report: string;
  turns: number;
  toolCalls: string[];
  usage: { inputTokens: number; outputTokens: number };
  stoppedBy: "answer" | "refusal" | "turn_limit";
}

const MAX_TURNS = 5;

// Reads from the in-memory `files` map, not disk — the model's filename is untrusted,
// so an unknown name fails with the list of what's actually available.
function readFromFiles(files: SourceFiles, filename: string): string {
  if (!Object.hasOwn(files, filename)) {
    throw new Error(`Unknown file "${filename}". Available files: ${Object.keys(files).join(", ")}`);
  }
  return files[filename] as string;
}

export async function runAudit(
  client: ClaudeClient,
  files: SourceFiles,
  options: AuditOptions = {}
): Promise<AuditResult> {
  const { onLog } = options;
  const fileNames = Object.keys(files);

  const tools: Anthropic.Beta.BetaTool[] = [
    {
      name: "read_file",
      description: "Read one of the provided source files by name. Use it before judging any file.",
      input_schema: {
        type: "object",
        properties: {
          filename: { type: "string", description: `One of: ${fileNames.join(", ")}` },
        },
        required: ["filename"],
        additionalProperties: false,
      },
      strict: true,
    },
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Audit these files for production security problems: ${fileNames.join(", ")}. Read each one with read_file, then list each problem, why it is dangerous, and the fix. Keep it short.`,
    },
  ];

  const toolCalls: string[] = [];
  let report = "";
  let inputTokens = 0;
  let outputTokens = 0;

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const response = await client.beta.messages.create({
      model: MODELS.default,
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools,
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    onLog?.(`turn ${turn}: stop_reason = ${response.stop_reason}`);

    const textBlocks = response.content.filter(
      (block): block is Anthropic.Beta.BetaTextBlock => block.type === "text"
    );
    if (textBlocks.length > 0) {
      report = textBlocks.map((block) => block.text).join("\n");
    }

    if (response.stop_reason === "refusal") {
      return { report, turns: turn, toolCalls, usage: { inputTokens, outputTokens }, stoppedBy: "refusal" };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use"
    );

    if (toolUses.length === 0) {
      return { report, turns: turn, toolCalls, usage: { inputTokens, outputTokens }, stoppedBy: "answer" };
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of toolUses) {
      const { filename } = call.input as { filename: string };
      const label = `${call.name}("${filename}")`;
      toolCalls.push(label);
      onLog?.(`Claude called ${label}`);
      try {
        results.push({ type: "tool_result", tool_use_id: call.id, content: readFromFiles(files, filename) });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ type: "tool_result", tool_use_id: call.id, content: message, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }

  return { report, turns: MAX_TURNS, toolCalls, usage: { inputTokens, outputTokens }, stoppedBy: "turn_limit" };
}
