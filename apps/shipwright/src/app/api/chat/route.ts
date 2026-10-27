// Chat backend: streams an AI SDK 7 UI message stream.
// Demo mode plays a script (no key); live mode calls Claude through @repo/ai.
import { CHAT_PROVIDER_OPTIONS, createChatModel } from "@repo/ai/chat";
import { createScriptedModel } from "@repo/ai/scripted-model";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  smoothStream,
  streamText,
  toUIMessageStream,
} from "ai";
import { env } from "@/env";
import { demoScript } from "@/lib/ask/demo-script";
import { askTools, ToolUserError } from "@/lib/ask/tools";
import type { AskMessage } from "@/lib/ask/tools";

export const maxDuration = 60;

const INSTRUCTIONS = `You are a senior engineer helping a non-technical founder understand the security of their app, acme/checkout-app.
Use the tools before answering. Never guess: if a tool did not show it, say you don't know.
Write in plain English. Keep answers short and end with one clear next step.`;

// Runs for stream errors AND tool errors. Only ToolUserError text is safe to show.
function onError(error: unknown) {
  if (error instanceof ToolUserError) return error.message;
  console.error("[api/chat]", error);
  return "Shipwright couldn't finish this answer. Please try again.";
}

export async function POST(req: Request) {
  const body: { messages?: unknown } | null = await req.json().catch(() => null);

  // The browser sends the whole history, including tool results it could fake, so we validate it.
  const result = await safeValidateUIMessages<AskMessage>({ messages: body?.messages, tools: askTools });
  if (!result.success) return Response.json({ error: "Invalid messages" }, { status: 400 });

  const apiKey = env.ANTHROPIC_API_KEY;
  const live = env.SHIPWRIGHT_AI_MODE === "live";
  if (live && !apiKey) {
    return Response.json(
      { error: "Live mode needs ANTHROPIC_API_KEY. Set it, or use SHIPWRIGHT_AI_MODE=demo." },
      { status: 500 },
    );
  }

  const stream = streamText({
    model: live && apiKey ? createChatModel({ apiKey }) : createScriptedModel(demoScript),
    instructions: INSTRUCTIONS,
    // Only the last 20 messages: keeps long chats cheap and inside the context window.
    messages: await convertToModelMessages(result.data.slice(-20)),
    tools: askTools,
    // openFixPR changes the founder's repo: it only runs after they click Approve.
    toolApproval: { openFixPR: "user-approval" },
    // The browser sends the whole history, so it could send a fake approval. With a secret, the
    // server signs each approval request and refuses approvals it didn't sign.
    experimental_toolApprovalSecret: env.TOOL_APPROVAL_SECRET,
    stopWhen: isStepCount(5),
    maxOutputTokens: 4000, // thinking tokens count too
    providerOptions: live ? CHAT_PROVIDER_OPTIONS : undefined,
    // The Stop button aborts the request; this makes it stop the model too.
    abortSignal: req.signal,
    onAbort: ({ steps }) => console.info(`[api/chat] stopped by the user after ${steps.length} step(s)`),
    experimental_transform: smoothStream({ chunking: "word" }),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: stream.stream,
      originalMessages: result.data,
      sendReasoning: true,
      onError,
    }),
  });
}
