# 0006 — AI-native UX

Date: 2026-10-27 · Status: Accepted

## Context

AI answers take seconds. In that time users need to see that the app heard them, what it is doing,
and how to stop it. Demos must not burn tokens, and model output is untrusted text.

## Decision

- **Transport:** AI SDK 7 UI message stream (`createUIMessageStreamResponse` + `toUIMessageStream`) and
  `useChat` with typed tool parts (`AskMessage`).
- **UI kit:** provider-agnostic components in `@repo/ui/ai` (no imports from `ai` or `@ai-sdk/*`).
- **Markdown:** Streamdown for streamed text, through `Response` only.
- **Models:** a scripted model in `@repo/ai` for demo mode (no key); Claude Sonnet 5.5 with summarized
  thinking for live mode.
- **Stopping:** `abortSignal: req.signal` plus `onAbort`, so Stop also stops the model.
- **Trust:** `safeValidateUIMessages` on the incoming history; `ToolUserError` is the only error text
  `onError` lets through.
- **Feedback:** `useOptimistic`, so a thumb lights up at once and rolls back if saving fails.
- **Loading:** Suspense with a skeleton that matches the real boxes.
- **Guardrail:** hook rule 7 blocks raw HTML, AI SDK 5/6 names, and `streamText` without `abortSignal`.
- **Versions:** pinned exactly in the pnpm catalog, each at least 24 h old; upgrade on purpose.

## Alternatives rejected

- **AI Elements:** faster to start, but a generic look and coupled to SDK types.
- **react-markdown:** flashes broken syntax while the text streams.
- **Raw HTML:** XSS.
- **Plain spinner:** no sense of progress during multi-second tool work.
- **Mocking `fetch` in the browser instead of a scripted model:** skips the real stream protocol and tool execution.

## Consequences

- Demo answers are scripted and can't adapt to errors.
- Two modes (demo and live) to test.
- Measured (with vs without the pattern): first feedback under 20 ms vs 507 ms; chat ready 0.26 s vs 1.07 s;
  a failed feedback save rolls back at about 770 ms; 114 vs 176 renders with vs without `throttle`.
