// Hybrid code search over the newest READY index of one app: keywords (exact names) plus meaning (questions), merged.
// Server only. This exact function is what the Day 16 audit agents call, so it needs no page, no session and no UI: the CALLER
// is responsible for checking that the person or agent may read this app (the page action does it with requireOrg).
//
// It returns a short snippet of each match, never the whole chunk. The text it searches was secret-masked before it was stored.
import "server-only";
import { isEmbeddingConfigured } from "@/env";
import { embedQuery } from "@/lib/ai/embeddings";
import { latestReadyIndex, searchChunks } from "@/lib/code-index/db";
import { makeSnippet, QuerySchema, type CodeHit } from "@/lib/code-index/search-core";

export type { CodeHit };

export type CodeSearchResult = {
  hits: CodeHit[];
  ms: number;
  // The commit that was searched: links to GitHub must use THIS sha. null = this app has no ready index yet.
  commitSha: string | null;
  // True when only keywords were used (embeddings not configured, or the embedding service failed this time).
  keywordOnly: boolean;
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 30;

export async function searchCode(input: { orgId: string; appId: string; query: string; limit?: number }): Promise<CodeSearchResult> {
  const started = Date.now();
  const done = (partial: Omit<CodeSearchResult, "ms">): CodeSearchResult => ({ ...partial, ms: Date.now() - started });

  const index = await latestReadyIndex({ orgId: input.orgId, appId: input.appId });
  if (!index) return done({ hits: [], commitSha: null, keywordOnly: true });

  const parsed = QuerySchema.safeParse(input.query);
  if (!parsed.success) return done({ hits: [], commitSha: index.commitSha, keywordOnly: true });

  // Meaning search needs a vector for the question. If that fails (no key, provider busy), keywords still work.
  let embedding: number[] | undefined;
  if (isEmbeddingConfigured()) {
    try {
      embedding = await embedQuery(parsed.data);
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      console.warn(`[search] query embedding failed, using keywords only: status=${typeof status === "number" ? status : "none"}`);
    }
  }

  const limit = Math.min(Math.max(Math.floor(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  let rows = await searchChunks({ orgId: input.orgId, appId: input.appId, text: parsed.data, embedding, limit });

  // The search function picks the newest ready index by itself. If a re-index finished between our lookup and the search, the
  // hits belong to the new index while our sha is the old one, and the GitHub links would point at the wrong code. So we
  // check again afterwards, and if the index changed, search once more and use the new sha.
  let current = index;
  const after = await latestReadyIndex({ orgId: input.orgId, appId: input.appId });
  if (after && after.id !== index.id) {
    current = after;
    rows = await searchChunks({ orgId: input.orgId, appId: input.appId, text: parsed.data, embedding, limit });
  }

  return done({
    hits: rows.map((row) => ({
      path: row.path,
      symbol: row.symbol,
      startLine: row.startLine,
      endLine: row.endLine,
      snippet: makeSnippet(row.content),
      matchedBy: row.matchedBy,
    })),
    commitSha: current.commitSha,
    keywordOnly: embedding === undefined,
  });
}
