# 0012 — AI on mobile: the app asks the same /api/chat

Date: 2026-11-11 · Status: Accepted

## Context

Founders want to ask Shipwright questions from their phone ("is my app safe to launch?"). We already have one AI
backend, `/api/chat`, with the system prompt, tools and approval flow. API keys must never ship inside an app: anyone
can unpack it and read them.

## Decision

- **The phone calls the same `/api/chat`** using AI SDK `useChat` with `DefaultChatTransport`. The transport uses
  `expo/fetch`, because React Native's own `fetch` cannot stream. The app holds no AI key (hook rule 12).
- **Tool types live in `@repo/ai/shared`** (`AskUITools`). A compile-time contract check (`contract.check.ts`) fails
  `check-types` if the server's real tools drift from the shared type.
- **`Content-Encoding: none`** on the stream, so proxies do not buffer it and words arrive as they are written.
- **Per-IP in-memory burst limit and input limits** (message count, length) until real auth arrives (Day 26). Since
  then ADR 0011 added the daily quota on top of this.
- **A client version header** (`x-shipwright-client: mobile/<version>`) so server logs show which app version called.
- **`MarkdownLite`**: a small renderer of our own for headings, lists, bold, code and links.
- **`react-native-keyboard-controller`** for the chat keyboard (`KeyboardChatScrollView`, `KeyboardStickyView`).
- **App variants** (development, preview, production) with their own names and bundle ids, so they install side by side.
- **Distribution:** EAS internal distribution for Android (an install link); a screen recording for iPhone until we
  have TestFlight.

## Alternatives rejected

- **Calling the model from the app:** the key would live in the app.
- **A separate mobile backend:** two AI systems to keep in sync.
- **WebSocketChatTransport:** Vercel functions do not hold sockets, and HTTP streaming is enough.
- **A markdown library:** web-only (`streamdown`, `react-markdown`) or old (`react-native-markdown-display`).
- **Built-in `KeyboardAvoidingView`:** unreliable on Android edge-to-edge.

## Consequences

- The API is now public and versioned: change the request or stream shape only in a backward-compatible way, or
  old installed apps break.
- The burst limit is in memory, so it is per server instance on Vercel. The real daily limit is in Redis (ADR 0011).
- An iPhone install needs the $99 Apple Developer account (TestFlight or ad hoc). Until then iPhone users see a video.
- The mobile chat has no sign-in yet, so limits are per network address, not per person.
