// Database helpers for the code index (what we know about a connected repo). Server only.
//
// All calls use the ADMIN client, so the database does not protect us here: every helper names the organization and
// filters by it. The authorization itself (is this person a member?) is done earlier, by the route, with requireOrg.
//
// Tables: code_indexes (one run), code_files (the map), code_chunks (the code + its vector, readable by the server only).
// Search and re-use of embeddings go through functions in the `server` schema. Errors carry only a database code, never
// code or text from the repo.
import "server-only";
import type { Json } from "@repo/db";
import { EMBEDDING } from "@/lib/ai/embeddings";
import { createAdminClient } from "@/lib/supabase/admin";

const ROWS_PER_INSERT = 200;
const HASHES_PER_CALL = 1000;
const MAX_SEARCH_LIMIT = 30; // the database function caps at 30 too
const MAX_ERROR_LENGTH = 500;

export class CodeIndexError extends Error {
  code: string;

  constructor(operation: string, code: string | undefined) {
    super(`Code index ${operation} failed (code ${code ?? "unknown"})`);
    this.name = "CodeIndexError";
    this.code = code ?? "unknown";
  }
}

export type CodeFileRow = {
  path: string;
  language: string;
  kind: "page" | "route" | "server_action" | "component" | "lib" | "migration" | "config" | "test" | "other";
  sizeBytes: number;
  sha256: string;
  symbols: NonNullable<Json>;
  imports: string[];
  envVars: string[]; // names only, never values
  isClient: boolean;
  redactions: number;
};

export type CodeChunkRow = {
  fileId: string; // from the Map that saveFiles returned
  path: string;
  symbol: string | null;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  embedding: number[] | null; // null = not embedded yet (reuseEmbeddings or a later step fills it)
};

// What finishIndex saves on the index row. (run-index.ts has its own, bigger IndexStats that it returns.)
export type FinishStats = {
  reusedChunks: number;
  embedTokens: number;
  costUsd: number;
  skipped: Record<string, number>;
  stack: NonNullable<Json>;
};

export type SearchHit = {
  chunkId: number;
  path: string;
  symbol: string | null;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
  matchedBy: "keyword" | "meaning" | "both";
};

const db = () => createAdminClient();
const server = () => createAdminClient().schema("server");

function fail(operation: string, error: { code?: string } | null): never {
  console.warn(`[code-index] ${operation} failed: code=${error?.code ?? "unknown"}`);
  throw new CodeIndexError(operation, error?.code);
}

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

// pgvector reads a vector from text like "[0.1,0.2,...]". Wrong size or a NaN is a bug on our side: refuse before the database does.
function toVectorString(vector: number[]): string {
  if (vector.length !== EMBEDDING.dims || !vector.every(Number.isFinite)) {
    throw new CodeIndexError("embedding check", "bad_vector");
  }
  return `[${vector.join(",")}]`;
}

// The app id of an index, only if the index belongs to this organization. Used by the writers below, so one organization can
// never write into another one's index even with a guessed id.
async function appIdOfIndex(orgId: string, indexId: string): Promise<string> {
  const { data, error } = await db().from("code_indexes").select("app_id").eq("id", indexId).eq("org_id", orgId).maybeSingle();
  if (error) fail("lookup", error);
  if (!data) throw new CodeIndexError("lookup", "not_found");
  return data.app_id;
}

// Starts a run: one row, status "running", with the model and size we are about to use. Returns the index id.
export async function createIndex(input: { orgId: string; appId: string; commitSha: string }): Promise<string> {
  // The table's foreign keys do not check that the app belongs to the organization, so we do.
  const app = await db().from("apps").select("id").eq("id", input.appId).eq("org_id", input.orgId).maybeSingle();
  if (app.error) fail("create", app.error);
  if (!app.data) throw new CodeIndexError("create", "app_not_in_org");

  const { data, error } = await db()
    .from("code_indexes")
    .insert({
      org_id: input.orgId,
      app_id: input.appId,
      commit_sha: input.commitSha,
      status: "running",
      embedding_model: EMBEDDING.model,
      dims: EMBEDDING.dims,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) fail("create", error);
  return data.id;
}

// Saves the code map in batches of 200. Returns path -> file id, which the chunks need.
export async function saveFiles(scope: { orgId: string; indexId: string }, files: CodeFileRow[]): Promise<Map<string, string>> {
  const appId = await appIdOfIndex(scope.orgId, scope.indexId);
  const ids = new Map<string, string>();
  for (const batch of batches(files, ROWS_PER_INSERT)) {
    const { data, error } = await db()
      .from("code_files")
      .insert(
        batch.map((file) => ({
          org_id: scope.orgId,
          app_id: appId,
          index_id: scope.indexId,
          path: file.path,
          language: file.language,
          kind: file.kind,
          size_bytes: file.sizeBytes,
          sha256: file.sha256,
          symbols: file.symbols,
          imports: file.imports,
          env_vars: file.envVars,
          is_client: file.isClient,
          redactions: file.redactions,
        })),
      )
      .select("id, path");
    if (error) fail("save files", error);
    for (const row of data) ids.set(row.path, row.id);
  }
  return ids;
}

// Saves chunks in batches of 200. A chunk without a vector is stored with a null embedding.
export async function saveChunks(scope: { orgId: string; indexId: string }, chunks: CodeChunkRow[]): Promise<void> {
  const appId = await appIdOfIndex(scope.orgId, scope.indexId);
  for (const batch of batches(chunks, ROWS_PER_INSERT)) {
    const { error } = await db()
      .from("code_chunks")
      .insert(
        batch.map((chunk) => ({
          org_id: scope.orgId,
          app_id: appId,
          index_id: scope.indexId,
          file_id: chunk.fileId,
          path: chunk.path,
          symbol: chunk.symbol,
          start_line: chunk.startLine,
          end_line: chunk.endLine,
          content: chunk.content,
          content_hash: chunk.contentHash,
          embedding: chunk.embedding ? toVectorString(chunk.embedding) : null,
        })),
      );
    if (error) fail("save chunks", error);
  }
}

// Which of these hashes already have an embedding in the latest ready index of this app? Those need no new embedding.
export async function knownHashes(input: { orgId: string; appId: string; hashes: string[] }): Promise<Set<string>> {
  const known = new Set<string>();
  for (const batch of batches([...new Set(input.hashes)], HASHES_PER_CALL)) {
    const { data, error } = await server().rpc("known_chunk_hashes", {
      p_org_id: input.orgId,
      p_app_id: input.appId,
      p_hashes: batch,
    });
    if (error) fail("known hashes", error);
    for (const hash of data ?? []) known.add(hash);
  }
  return known;
}

// Copies vectors of unchanged chunks from the previous ready index into this one. Returns how many chunks were filled.
export async function reuseEmbeddings(input: { orgId: string; appId: string; indexId: string }): Promise<number> {
  const { data, error } = await server().rpc("reuse_embeddings", {
    p_org_id: input.orgId,
    p_app_id: input.appId,
    p_new_index_id: input.indexId,
  });
  if (error) fail("reuse embeddings", error);
  return data ?? 0;
}

// Marks the run ready (the database refuses if a chunk still has no vector) and removes older indexes.
export async function finishIndex(input: { orgId: string; indexId: string; stats: FinishStats }): Promise<void> {
  const { stats } = input;
  const update = await db()
    .from("code_indexes")
    .update({
      reused_chunks: stats.reusedChunks,
      embed_tokens: stats.embedTokens,
      cost_usd: stats.costUsd,
      skipped: stats.skipped,
      stack: stats.stack,
    })
    .eq("id", input.indexId)
    .eq("org_id", input.orgId)
    .select("id");
  if (update.error) fail("finish", update.error);
  if (update.data.length === 0) throw new CodeIndexError("finish", "not_found");

  const { error } = await server().rpc("finish_code_index", { p_org_id: input.orgId, p_index_id: input.indexId });
  if (error) fail("finish", error);
}

// Marks the run failed. Keep the message short and free of repo code: it is shown in the dashboard.
export async function failIndex(input: { orgId: string; indexId: string; message: string }): Promise<void> {
  const { error } = await db()
    .from("code_indexes")
    .update({ status: "failed", error: input.message.slice(0, MAX_ERROR_LENGTH), finished_at: new Date().toISOString() })
    .eq("id", input.indexId)
    .eq("org_id", input.orgId)
    // Only a run that is still going can fail. A run that already finished (ready) must never be flipped to failed, for
    // example when the "finished" reply was lost on the way back and we think it failed.
    .in("status", ["queued", "running"])
    .select("id");
  if (error) fail("mark failed", error);
  // Zero rows = it was already closed (ready, failed or cleaned up). That is fine, not an error.
}

// Hybrid search (keywords + meaning) in the latest ready index of this app. Without an embedding it is keyword search only.
export async function searchChunks(input: {
  orgId: string;
  appId: string;
  text: string;
  embedding?: number[];
  limit: number;
}): Promise<SearchHit[]> {
  const { data, error } = await server().rpc("search_code", {
    p_org_id: input.orgId,
    p_app_id: input.appId,
    p_query_text: input.text,
    p_query_embedding: input.embedding ? toVectorString(input.embedding) : undefined,
    p_match_count: Math.min(Math.max(Math.floor(input.limit), 1), MAX_SEARCH_LIMIT),
  });
  if (error) fail("search", error);
  return (data ?? []).map((row) => ({
    chunkId: row.chunk_id,
    path: row.path,
    symbol: row.symbol,
    startLine: row.start_line,
    endLine: row.end_line,
    content: row.content,
    score: row.score,
    matchedBy: row.matched_by === "both" ? "both" : row.matched_by === "keyword" ? "keyword" : "meaning",
  }));
}

// The repository of an app, only if the app belongs to this organization. The index run reads it from here, never from the browser.
export async function getAppForIndex(input: { orgId: string; appId: string }): Promise<{ repoFullName: string; defaultBranch: string } | null> {
  const { data, error } = await db()
    .from("apps")
    .select("repo_full_name, default_branch")
    .eq("id", input.appId)
    .eq("org_id", input.orgId)
    .maybeSingle();
  if (error) fail("read app", error);
  return data ? { repoFullName: data.repo_full_name, defaultBranch: data.default_branch } : null;
}

// A run that was queued or running for longer than `olderThanMs` is dead (the process was stopped). Mark it failed, so it
// stops blocking new runs. Returns how many were cleaned up.
export async function failStaleIndexes(input: { orgId: string; appId: string; olderThanMs: number; message: string }): Promise<number> {
  const cutoff = new Date(Date.now() - input.olderThanMs).toISOString();
  const { data, error } = await db()
    .from("code_indexes")
    .update({ status: "failed", error: input.message.slice(0, MAX_ERROR_LENGTH), finished_at: new Date().toISOString() })
    .eq("org_id", input.orgId)
    .eq("app_id", input.appId)
    .in("status", ["queued", "running"])
    .lt("created_at", cutoff)
    .select("id");
  if (error) fail("clean up", error);
  return data.length;
}

// One row in usage_events for the tokens we paid for. Nothing to record when no token was spent (a re-index of unchanged code).
export async function recordUsage(input: { orgId: string; appId: string; indexId: string; tokens: number; costUsd: number }): Promise<void> {
  if (input.tokens <= 0) return;
  const { error } = await db().from("usage_events").insert({
    org_id: input.orgId,
    app_id: input.appId,
    kind: "ai_tokens",
    quantity: input.tokens,
    cost_usd: input.costUsd,
    meta: { purpose: "code_index", indexId: input.indexId },
  });
  if (error) fail("record usage", error);
}

// The newest READY index of an app (what search looks at), only if it belongs to this organization.
export async function latestReadyIndex(input: { orgId: string; appId: string }): Promise<{ id: string; commitSha: string } | null> {
  const { data, error } = await db()
    .from("code_indexes")
    .select("id, commit_sha")
    .eq("org_id", input.orgId)
    .eq("app_id", input.appId)
    .eq("status", "ready")
    .order("finished_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("read index", error);
  return data ? { id: data.id, commitSha: data.commit_sha } : null;
}
