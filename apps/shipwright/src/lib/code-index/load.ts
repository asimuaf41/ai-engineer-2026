// Builds what the Code page shows, AS THE SIGNED-IN PERSON (the user client, so the database rules decide what is visible).
// Only the code map is read here, never the code itself. Server only.
import "server-only";
import type { Json } from "@repo/db";
import { summarizeFiles, stackChips, type FileKind } from "@/lib/code-index/code-map-view";
import { isStale } from "@/lib/code-index/index-plan";
import { countFiles, readFileRows, readFilesOfKind } from "@/lib/code-index/read";
import type { CodeIndexData, IndexInfo } from "@/lib/code-index/view-data";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

const COLUMNS = "id, status, commit_sha, files_count, chunks_count, reused_chunks, embed_tokens, cost_usd, error, started_at, finished_at, created_at, stack, skipped";

type IndexRow = {
  id: string;
  status: string;
  commit_sha: string;
  files_count: number;
  chunks_count: number;
  reused_chunks: number;
  embed_tokens: number;
  cost_usd: number;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  stack: Json;
  skipped: Json;
};

// `skipped.dev_sample` is how many chunks a development run left out (see run-index.ts). Anything else means a full index.
function isSampleRun(skipped: Json): boolean {
  if (typeof skipped !== "object" || skipped === null || Array.isArray(skipped)) return false;
  const leftOut = skipped.dev_sample;
  return typeof leftOut === "number" && leftOut > 0;
}

const STATUSES = ["queued", "running", "ready", "failed"] as const;

function toInfo(row: IndexRow): IndexInfo {
  const status = STATUSES.find((value) => value === row.status) ?? "failed";
  return {
    status,
    // "Running" for longer than 15 minutes means the run died: show it as stopped, not as still going.
    stopped: (status === "running" || status === "queued") && isStale(row.created_at, new Date()),
    commitSha: row.commit_sha,
    filesCount: row.files_count,
    chunksCount: row.chunks_count,
    reusedChunks: row.reused_chunks,
    isSample: isSampleRun(row.skipped),
    embedTokens: row.embed_tokens,
    costUsd: row.cost_usd,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

async function newestIndex(db: Db, appId: string, readyOnly: boolean): Promise<IndexRow | null> {
  const base = db.from("code_indexes").select(COLUMNS).eq("app_id", appId);
  // "Newest ready" must be the one search uses (db.ts latestReadyIndex): by finish time first, so the header, the code map and
  // the search all describe the same index.
  const { data, error } = await (readyOnly
    ? base.eq("status", "ready").order("finished_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false })
    : base.order("created_at", { ascending: false })
  )
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not read the index (code ${error.code}).`);
  return data;
}

export async function loadCodeIndexData(input: {
  db: Db;
  slug: string;
  appId: string;
  repoFullName: string;
  canManage: boolean;
  selectedKind: FileKind | null;
}): Promise<CodeIndexData> {
  const { db, appId } = input;
  const [latestRow, readyRow] = await Promise.all([newestIndex(db, appId, false), newestIndex(db, appId, true)]);
  const latest = latestRow ? toInfo(latestRow) : null;
  const ready = readyRow ? toInfo(readyRow) : null;

  const running = !!latest && (latest.status === "running" || latest.status === "queued") && !latest.stopped;
  const filesRead = running && latestRow ? await countFiles(db, latestRow.id) : null;

  let map = null;
  let kindFiles = null;
  let selectedKind: FileKind | null = null;
  if (readyRow) {
    map = summarizeFiles(await readFileRows(db, readyRow.id));
    // Only open a chip that really has files (a made-up ?kind= shows nothing).
    if (input.selectedKind && map.kinds.some((entry) => entry.kind === input.selectedKind)) {
      selectedKind = input.selectedKind;
      kindFiles = await readFilesOfKind(db, readyRow.id, selectedKind);
    }
  }

  return {
    slug: input.slug,
    appId,
    repoFullName: input.repoFullName,
    canManage: input.canManage,
    latest,
    ready,
    filesRead,
    map,
    stack: stackChips(readyRow?.stack),
    selectedKind,
    kindFiles,
  };
}
