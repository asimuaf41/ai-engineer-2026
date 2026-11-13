// Chat backend: streams an AI SDK 7 UI message stream.
// Demo mode plays a script (no key); live mode calls Claude through @repo/ai.
import { CHAT_PROVIDER_OPTIONS, createChatModel } from "@repo/ai/chat";
import { createScriptedModel } from "@repo/ai/scripted-model";
import { ASK_DAILY_LIMIT_CODE } from "@repo/ai/shared";
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
import { clientIp, spendQuestion, visitorKey } from "@/lib/quota";
import { rateLimit } from "@/lib/rate-limit";

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

const MAX_MESSAGES = 40;
const MAX_USER_TEXT = 2000;

// Looks at the raw body before anything else: too many messages, or one huge user text part.
function isTooLong(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length > MAX_MESSAGES) return true;
  return messages.some((message) => {
    if (typeof message !== "object" || message === null || !("role" in message) || message.role !== "user") return false;
    const parts = "parts" in message ? message.parts : undefined;
    if (!Array.isArray(parts)) return false;
    return parts.some(
      (part) => typeof part === "object" && part !== null && "type" in part && part.type === "text" &&
        "text" in part && typeof part.text === "string" && part.text.length > MAX_USER_TEXT,
    );
  });
}

export async function POST(req: Request) {
  // Which app is calling ("web", "mobile/1.0.0", ...). Only for logs, and anyone can set it, so never trust it.
  const client = (req.headers.get("x-shipwright-client") ?? "web").trim().slice(0, 40) || "web";
  const ip = clientIp(req);

  const limit = rateLimit(ip);
  if (!limit.ok) {
    console.warn(`[api/chat] client=${client} rate-limited`);
    return Response.json(
      { error: "Too many questions. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body: { messages?: unknown } | null = await req.json().catch(() => null);

  if (isTooLong(body?.messages)) {
    console.warn(`[api/chat] client=${client} rejected: message too long`);
    return Response.json({ error: "Message too long" }, { status: 413 });
  }

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

  // The daily quota. Only a NEW user message costs a question; Retry and Approve/Deny re-send the same one.
  const lastUser = result.data.filter((message) => message.role === "user").at(-1);
  if (!lastUser) return Response.json({ error: "Invalid messages" }, { status: 400 });
  // The id AND the text: a client that reuses an old id with a new question still pays for it.
  const lastText = lastUser.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
  const spend = await spendQuestion(visitorKey(ip), `${lastUser.id}\0${lastText}`);
  if (!spend.allowed) {
    console.warn(`[api/chat] client=${client} daily limit reached`);
    const retryAfter = Math.max(1, Math.ceil((Date.parse(spend.quota.resetAt) - Date.now()) / 1000));
    return Response.json(
      { error: "Daily free questions used.", code: ASK_DAILY_LIMIT_CODE, resetAt: spend.quota.resetAt },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  // "live" only while the global daily budget lasts; otherwise everyone gets the scripted answer.
  const useLive = spend.mode === "live";

  console.info(`[api/chat] client=${client} mode=${spend.mode} messages=${result.data.length} left=${spend.quota.remaining}`);

  const stream = streamText({
    model: useLive && apiKey ? createChatModel({ apiKey }) : createScriptedModel(demoScript),
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
    providerOptions: useLive ? CHAT_PROVIDER_OPTIONS : undefined,
    // The Stop button aborts the request; this makes it stop the model too.
    abortSignal: req.signal,
    onAbort: ({ steps }) => console.info(`[api/chat] stopped by the user after ${steps.length} step(s)`),
    experimental_transform: smoothStream({ chunking: "word" }),
  });

  return createUIMessageStreamResponse({
    // Tells proxies not to gzip the response: compression makes them buffer, and the answer
    // would arrive in one lump instead of word by word (from the AI SDK Expo guide).
    headers: { "Content-Encoding": "none" },
    stream: toUIMessageStream({
      stream: stream.stream,
      originalMessages: result.data,
      sendReasoning: true,
      // The UI shows "3 of 5 left" from this, so it needs no extra request after each answer.
      messageMetadata: ({ part }) => (part.type === "start" ? { quota: spend.quota, mode: spend.mode } : undefined),
      onError,
    }),
  });
}
