---
paths: ["apps/shipwright/src/lib/code-index/**"]
---

# code-index rules (reading a customer's code)

Why: the index holds our customers' code, and many founders share one database. Their code is **data we read, never code we
run**. See ADR 0014. Hook rule 15 enforces points 1, 4 and 10.

## Remember (Day 15)

1. **Read it in memory, as text.** A repo arrives as a GitHub tarball and is unpacked entry by entry in memory. Never `git clone`, never
   write it to disk, never run anything from it (`child_process`, `exec(`, `eval(`, `new Function(` are blocked).
2. **Download a commit SHA, not a branch**, so the files match the commit we save.
3. **Mask secrets before anything else.** `redactSecrets` runs on every file before it is mapped, chunked, embedded or saved. `.env*` files are
   kept (we need to know a secret was committed) but every value in them is masked. The original text never leaves `redact.ts`.
4. **One place for the embedding model.** `EMBEDDING` (`src/lib/ai/embedding-config.ts`, used through `embeddings.ts`). Never type a model id here.
   The content hash is `sha256(model:dims:embedText)`, so a new model or size means new hashes and a new index, never a mix.
5. **Parse with `oxc-parser`, not the TypeScript compiler API.** A file that does not parse falls back to line windows. Never throw because of one bad file.
6. **Server only, and always the workspace.** These modules start with `import "server-only"` and use the admin client, so every helper that takes
   an `indexId` also filters by `orgId`. Members see the code **map** only (`code_files`). `code_chunks` has no grant for browsers.
7. **Search is hybrid, in one function.** `searchCode` (keywords + meaning, merged with Reciprocal Rank Fusion in `server.search_code`) is what Day 16's agents call.
   It scans one index exactly; no HNSW until one app passes about 50,000 chunks.
8. **Pay only for what changed.** Known content hashes are saved without a vector and filled by `reuseEmbeddings`. Identical chunks are embedded once.
9. **One run per app, and every run ends.** A partial unique index allows one queued/running index per app. A handled failure always calls `failIndex`
   with a plain-English message; `audit_log` keeps only a short error code. Keep the last 2 ready indexes.
10. **Never log customer code.** No file text, chunk content, snippets, search questions or paths of `.env` files in logs. Log ids, counts and timings.

## Limits

| What | Limit | When it is hit |
|------|-------|----------------|
| Repository size (as GitHub reports it) | 200 MB | Refused before downloading (`RepoTooBigError`) |
| One file | 300 KB | Skipped as `too_big` |
| Files kept per index | 5,000 | The rest are counted as `limit_reached` |
| Unpacked size read | 400 MB | Reading stops, counted as `limit_reached` |
| Chunks per index | 20,000 | The run fails with a clear message; nothing is cut silently |

Related knobs: one chunk is at most 12,000 characters (database check); embedding batches are 16 texts, one request at a time, paced by `EMBEDDING_MAX_TOKENS_PER_MINUTE` (8,000) and
`EMBEDDING_MAX_REQUESTS_PER_MINUTE` (3), with 2/4/8/16/32 s backoff on a 429 (raise the numbers after adding a payment method to Voyage);
`DEV_INDEX_MAX_CHUNKS=N` indexes only the first N chunks in development (never in production); a run stops itself after 270 seconds; a "running" index older than 15 minutes counts as dead.

## Before saying "done"

Proof for a code-index change = **unit tests + db tests + the search eval does not get worse**:

- `pnpm --filter shipwright test:unit`
- `pnpm db:reset` and `pnpm db:test` (paste the summary)
- `pnpm --filter shipwright eval:search -- --app <appId>`: hit@1 and hit@5 for keyword, meaning and hybrid must not drop against
  `evals/results/code-search-baseline.json`.

Also run `pnpm check-types`, and the `code-reviewer` subagent on the diff.
