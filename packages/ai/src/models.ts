export const MODELS = {
  default: "claude-sonnet-5-5",
  // Chat UIs need a fast first token.
  chat: "claude-sonnet-5-5",
} as const;

export type ModelKey = keyof typeof MODELS;
export type ModelId = (typeof MODELS)[ModelKey];
