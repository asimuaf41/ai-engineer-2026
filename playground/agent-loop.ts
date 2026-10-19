import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const SAMPLES_DIR = resolve(import.meta.dirname, "samples");

// 1) The tool: what Claude is allowed to do. Here: read one file from samples/ only.
const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "read_file",
    description:
      "Read a source file from the project's samples folder. Use it before judging any file.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "File name inside samples/, e.g. supabase.ts" },
      },
      required: ["filename"],
      additionalProperties: false,
    },
    strict: true,
  },
];

// 2) The tool's real code. Never trust the model's input: block "../" path tricks.
async function readSample(filename: string): Promise<string> {
  const fullPath = resolve(SAMPLES_DIR, filename);
  const rel = relative(SAMPLES_DIR, fullPath);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`"${filename}" resolves outside samples/.`);
  }
  return readFile(fullPath, "utf8");
}

async function main() {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content:
        "Audit supabase.ts for production security problems. List each problem, why it is dangerous, and the fix. Keep it short.",
    },
  ];

  // 3) The loop: ask -> Claude calls tools -> we run them -> send results back -> repeat.
  for (let turn = 1; turn <= 5; turn++) {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" }, // small task, so low effort = faster + cheaper
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if a safety check declines, the API retries on another model
      tools,
      messages,
    });

    console.log(`turn ${turn}: stop_reason = ${response.stop_reason}`);

    if (response.stop_reason === "refusal") {
      console.log("Claude declined this request.");
      return;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolCalls = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use"
    );

    if (toolCalls.length === 0) {
      // No tool calls left: this is the final answer.
      for (const block of response.content) {
        if (block.type === "text") console.log(block.text);
      }
      return;
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const call of toolCalls) {
      const { filename } = call.input as { filename: string };
      console.log(`Claude called ${call.name}("${filename}")`);
      try {
        results.push({ type: "tool_result", tool_use_id: call.id, content: await readSample(filename) });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ type: "tool_result", tool_use_id: call.id, content: message, is_error: true });
      }
    }
    // All tool results go back in ONE user message.
    messages.push({ role: "user", content: results });
  }
  console.log("Stopped after 5 turns (safety limit).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
