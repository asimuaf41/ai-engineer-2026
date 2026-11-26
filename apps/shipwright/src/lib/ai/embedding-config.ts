// The embedding model we use. Plain data with no server-only import, so pure code (like the chunker's content hash)
// and unit tests can read it. embeddings.ts re-exports it.
export const EMBEDDING = { provider: "voyage", model: "voyage-code-4", dims: 1024, usdPerMTokens: 0.12 } as const;
