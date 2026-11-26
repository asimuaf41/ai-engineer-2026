// Builds a complete, searchable index of one app's code, and pays only for chunks that changed since the last ready index.
// Server only. Runs inside `after()` (see apps/[appId]/actions.ts), so the founder's click returns at once.
//
// Order of work (and why it is safe to die in the middle):
//   1. fetch + map + chunk: memory only, NO database writes. Too many chunks fails here, before anything is stored.
//   2. save files, 3. ask which chunk hashes the last READY index already has, 4. save those chunks without a vector,
//   5. embed the new ones in groups and save each group, 6. log the tokens we paid for, 7. copy vectors for the known chunks,
//   8. finish: the database refuses to mark the index ready if any chunk lacks a vector.
// Until step 8 this index is "running" and nothing reads it: search uses the newest READY index, which stays untouched.
// A handled failure always ends in failIndex. A killed process leaves "running", which the next start cleans up after 15 minutes.
//
// Logs: one line per phase (name, ms, counts). Never file text, never file paths.
import "server-only";
import { embedDocuments } from "@/lib/ai/embeddings";
import { env } from "@/env";
import { EMBEDDING } from "@/lib/ai/embedding-config";
import { recordAudit } from "@/lib/audit";
import { detectStack, mapFile } from "@/lib/code-index/code-map";
import { chunkFile, type Chunk } from "@/lib/code-index/chunk";
import {
  failIndex,
  finishIndex,
  getAppForIndex,
  knownHashes,
  recordUsage,
  reuseEmbeddings,
  saveChunks,
  saveFiles,
  type CodeChunkRow,
  type CodeFileRow,
} from "@/lib/code-index/db";
import { fetchRepo } from "@/lib/code-index/fetch-repo";
import { explainIndexError } from "@/lib/code-index/index-errors";
import { assertCanFinish, assertChunkLimit, assertWithinDeadline, costUsd, devSampleLimit, EMBED_GROUP_SIZE, groupsOf, pickSample, planEmbeddings, SOFT_DEADLINE_MS } from "@/lib/code-index/index-plan";

export type IndexStats = {
  files: number;
  chunks: number;
  embedded: number; // chunks that got a brand-new vector (we paid for them)
  reused: number; // chunks whose vector was copied from the previous ready index (free)
  tokens: number;
  costUsd: number;
  ms: number;
  skipped: Record<string, number>;
};

export async function runIndex(input: {
  orgId: string;
  appId: string;
  indexId: string;
  installationId: number;
  repoFullName: string;
  commitSha?: string;
  actorId?: string | null;
}): Promise<IndexStats> {
  const { orgId, appId, indexId } = input;
  const startedAt = Date.now();
  let tokens = 0;
  let lap = Date.now();
  // `last` = the index is already ready: never throw a timeout after that, or a finished run would be marked failed.
  const log = (phase: string, counts: Record<string, number>, last = false) => {
    const now = Date.now();
    console.info(`[index ${indexId.slice(0, 8)}] ${phase} ${now - lap}ms ${JSON.stringify(counts)}`);
    lap = now;
    if (!last) assertWithinDeadline(startedAt, now);
  };

  try {
    // The repository comes from our own database, not from the caller: it must be the app's repo.
    const app = await getAppForIndex({ orgId, appId });
    if (!app || app.repoFullName !== input.repoFullName) throw new Error("The app does not match this repository.");

    // 1) Fetch, then redact + map + chunk every file (in memory).
    const repo = await fetchRepo({ installationId: input.installationId, repoFullName: input.repoFullName, ref: input.commitSha ?? app.defaultBranch });
    const skipped: Record<string, number> = {};
    for (const [reason, count] of Object.entries(repo.skipped)) if (count > 0) skipped[reason] = count;
    log("fetch", { files: repo.files.length, bytes: repo.totalBytes, skipped: Object.values(skipped).reduce((a, b) => a + b, 0) });

    const fileRows: CodeFileRow[] = [];
    const allChunks: Chunk[] = [];
    let redactions = 0;
    for (const file of repo.files) {
      const info = mapFile(file);
      redactions += info.redactions;
      fileRows.push({
        path: info.path,
        language: info.language,
        kind: info.kind,
        sizeBytes: info.sizeBytes,
        sha256: info.sha256,
        symbols: info.symbols,
        imports: info.imports,
        envVars: info.envVars,
        isClient: info.isClient,
        redactions: info.redactions,
      });
      allChunks.push(...chunkFile(file, info));
    }
    const stack = detectStack(repo.files);
    log("chunk", { files: fileRows.length, chunks: allChunks.length, redactions });
    assertChunkLimit(allChunks.length); // before any write, on the full count

    // Development only (DEV_INDEX_MAX_CHUNKS): index just the first N chunks and say so. The index is still "ready", and the Code
    // page shows it as a sample. `dev_sample` is the number of chunks left out.
    const { kept: chunks, leftOut } = pickSample(allChunks, devSampleLimit(env.DEV_INDEX_MAX_CHUNKS, process.env.NODE_ENV));
    if (leftOut > 0) {
      skipped.dev_sample = leftOut;
      log("dev_sample", { kept: chunks.length, left_out: leftOut });
    }

    // 2) Files.
    const fileIds = await saveFiles({ orgId, indexId }, fileRows);
    log("save_files", { files: fileIds.size });

    // 3) Which chunks does the last ready index already have a vector for?
    const known = await knownHashes({ orgId, appId, hashes: chunks.map((chunk) => chunk.contentHash) });
    const plan = planEmbeddings(chunks, known);
    log("known_hashes", { known: plan.known.length, new: plan.fresh.size });
    // Refuse BEFORE paying when the new chunks can't be embedded in time at our Voyage budget (the work would be lost on a timeout).
    assertCanFinish([...plan.fresh.values()].map((same) => same[0]?.embedText ?? ""), env.EMBEDDING_MAX_TOKENS_PER_MINUTE, Date.now() - startedAt);

    const toRow = (chunk: Chunk, embedding: number[] | null): CodeChunkRow => {
      const fileId = fileIds.get(chunk.path);
      if (!fileId) throw new Error("A chunk has no saved file.");
      return {
        fileId,
        path: chunk.path,
        symbol: chunk.symbol,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
        contentHash: chunk.contentHash,
        embedding,
      };
    };

    // 4) Known chunks: saved without a vector, filled in by reuseEmbeddings below.
    await saveChunks({ orgId, indexId }, plan.known.map((chunk) => toRow(chunk, null)));
    log("save_known", { chunks: plan.known.length });

    // 5) New chunks: embed a group, save it, next group. Identical code in two files is embedded once.
    let embedded = 0;
    for (const hashes of groupsOf([...plan.fresh.keys()], EMBED_GROUP_SIZE)) {
      assertWithinDeadline(startedAt, Date.now());
      const texts = hashes.map((hash) => {
        const text = plan.fresh.get(hash)?.[0]?.embedText;
        if (!text) throw new Error("A new chunk has no text to embed.");
        return text;
      });
      const result = await embedDocuments(texts, { deadline: startedAt + SOFT_DEADLINE_MS });
      tokens += result.tokens;
      // 6) Log what we paid for right after each group, so a later failure (or a killed process) cannot lose it.
      // A failure to log must not stop the run.
      try {
        await recordUsage({ orgId, appId, indexId, tokens: result.tokens, costUsd: costUsd(result.tokens) });
      } catch {
        console.warn(`[index ${indexId.slice(0, 8)}] could not record usage`);
      }
      const rows: CodeChunkRow[] = [];
      hashes.forEach((hash, index) => {
        for (const chunk of plan.fresh.get(hash) as Chunk[]) rows.push(toRow(chunk, result.vectors[index] as number[]));
      });
      await saveChunks({ orgId, indexId }, rows);
      embedded += rows.length;
    }
    log("embed", { embedded, tokens });

    // 7) Copy vectors for the known chunks.
    const reused = plan.known.length > 0 ? await reuseEmbeddings({ orgId, appId, indexId }) : 0;
    log("reuse", { reused });

    // 8) Finish. The database refuses if any chunk still has no vector.
    const cost = costUsd(tokens);
    await finishIndex({ orgId, indexId, stats: { reusedChunks: reused, embedTokens: tokens, costUsd: cost, skipped, stack } });
    const stats: IndexStats = { files: fileRows.length, chunks: chunks.length, embedded, reused, tokens, costUsd: cost, ms: Date.now() - startedAt, skipped };
    log("finish", { files: stats.files, chunks: stats.chunks, embedded, reused, tokens }, true);
    console.info(`[index ${indexId.slice(0, 8)}] done ${JSON.stringify({ ...stats, model: EMBEDDING.model })}`);
    return stats;
  } catch (error) {
    // Close the run properly, tell the founder in plain words, keep only a short code in the audit log.
    const failure = explainIndexError(error);
    console.warn(`[index ${indexId.slice(0, 8)}] failed: ${failure.code}`);
    try {
      await failIndex({ orgId, indexId, message: failure.message });
    } catch {
      console.warn(`[index ${indexId.slice(0, 8)}] could not mark the index failed`);
    }
    await recordAudit({ orgId, actorId: input.actorId ?? null, action: "code_index.failed", metadata: { index_id: indexId, code: failure.code } });
    throw error;
  }
}
