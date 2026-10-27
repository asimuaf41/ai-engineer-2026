---
paths: ["packages/ai/**"]
---

# packages/ai rules

- No `fs` and no `process.env` in this package — the caller passes the API key and data in.
- Model ids only in `src/models.ts`.
- Agent loops use `for (let turn = 1; turn <= MAX_TURNS; turn++)` — never `while (true)`.
- Send all `tool_result` blocks for a turn in ONE user message; failed tools get `is_error: true`.
- Handle every `stop_reason`: `tool_use`, `end_turn`, `refusal` and `max_tokens`.
- Return typed results (not strings to parse) and log through the `onLog` callback.
- AI SDK 7 only: `createUIMessageStreamResponse` + `toUIMessageStream`, `isStepCount`, `throttle`,
  `instructions` (not `system`). No `toUIMessageStreamResponse`, `stepCountIs`, `maxSteps`.
- Chat models come from `createChatModel` in `@repo/ai/chat`; scripted demo models from
  `@repo/ai/scripted-model`.
- Look up user-controlled tool names/keys with `Object.hasOwn`, never `obj[key]` alone.
