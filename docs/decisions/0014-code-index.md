# 0014 — Code index: read a customer's repo in memory, search it by name and by meaning

Date: 2026-11-24 · Status: Accepted

## Context

Day 16's audit agents need the whole codebase of a customer's app, not just the file they were pointed at. That code is
**untrusted**: it can hold secrets, odd file names, huge or binary files, and text written to trick a model. It is also private
(many founders share one database, ADR 0013). And it costs money every time we read it: turning code into vectors is billed
per token, and a re-index will run on every push (Day 25), so paying for unchanged code again would add up quickly.

## Decision

- **Fetch a GitHub tarball at one commit SHA and unpack it in memory.** Entry by entry through gunzip and `tar-stream`.
  Nothing is written to disk and nothing is run. Paths with `..`, absolute paths, links, binaries, generated files, huge files
  and the usual folders (`node_modules`, `dist`, lockfiles, images) are skipped and counted. Limits: 200 MB repo, 300 KB file,
  5,000 files, 400 MB unpacked, 20,000 chunks.
- **Parse with `oxc-parser`.** It reads TypeScript and JSX natively, with offsets we can turn into line numbers. A file that
  fails to parse falls back to line windows.
- **Chunk by declaration, with a path header.** One chunk per top-level function, class or component (SQL per statement, other
  text in line windows). Each is embedded as `// <path> · <symbol> · lines <a>-<b>` followed by the code, so a result always says
  where it came from.
- **Mask secrets before storing.** `redactSecrets` uses the key patterns of our Day 3 scanner hook and masks every value in `.env`
  files. Everything after it (map, chunks, hashes, embeddings) only ever sees the masked text.
- **`voyage-code-4`, 1024 dimensions, behind one module.** `EMBEDDING` is the only place with the model id, size and price.
  Every vector is checked for the right length.
- **Hybrid search in a server-only function.** `searchCode` merges keyword (full-text) and meaning (vector) results with Reciprocal
  Rank Fusion inside `server.search_code`. Code needs both: an exact name like `SUPABASE_SECRET_KEY`, and a question like
  "where do we check if the user paid?".
- **An exact scan per index, no HNSW yet.** Search always filters to one index (one repo, usually under 20,000 chunks). An exact
  scan of that takes a few milliseconds with full recall. We add HNSW when one app passes about 50,000 chunks.
- **Content hashes and reuse.** A chunk's hash covers model, size and text. A re-index asks which hashes the last ready index
  already has, copies those vectors, and embeds only what changed.
- **Go gently with Voyage.** One request at a time, 16 texts each, paced to a tokens-per-minute and requests-per-minute budget
  (defaults suit an account without a payment method), and a 429 is waited out with backoff instead of failing the index. In
  development `DEV_INDEX_MAX_CHUNKS` indexes a small, stable sample (`src/` first) so a test run is quick and free.
- **Keep 2 ready indexes, one active run per app.** The older ones are pruned; a partial unique index stops two runs at once.
- **Members see the map only.** File kinds, symbols and env var names are readable through RLS. Chunks (the code itself) and
  vectors have no grant for browsers and are read by server code only.

## Alternatives rejected

- **`git clone` to disk:** runs git on untrusted input, writes customer code to disk, and needs cleanup.
- **The TypeScript compiler API:** the TypeScript 7 rewrite changed it, and it is heavy for reading declarations.
- **Fixed-size token chunks:** they cut functions in half and lose the symbol name that makes a result understandable.
- **Vector-only search:** it misses exact names (`SUPABASE_SECRET_KEY`); keyword-only misses questions.
- **OpenAI `text-embedding-3-small`:** a general-purpose model; `voyage-code-4` is built for code, which is all we embed.
- **HNSW now:** at this size it adds build cost and can return fewer rows than asked once the filter is applied; the exact scan is faster.
- **Storing raw secrets:** a leak from us would then include their keys. We keep the fact that a secret was found, not the secret.

## Consequences

- Day 16's agents call `searchCode`; they need no page and no session, but the caller must check the person may read the app.
- `runIndex` runs inside `after()` today (limit 300 seconds, a soft stop at 270). Day 19 moves it to a durable job.
- Day 25 re-indexes on every push. Content hashes keep that cheap, so the cost is only the changed chunks.
- Customer code is sent to Voyage to be embedded. **Voyage data-retention setting: TODO (Asim to fill in the setting chosen in the Voyage
  dashboard).** The PRD says only that code is sent to Voyage for embeddings, nothing more, until this is filled in.
- Hook rule 15 blocks running or writing code, logging it, and a second place for the model id. `.claude/rules/code-index.md` lists the rules.
- A change to chunking, the embedding model or search must not make the search eval worse.

### Search eval

Run `pnpm --filter shipwright eval:search -- --app <appId>` on the indexed repo and save the result as `evals/results/code-search-baseline.json`.

| mode | hit@1 | hit@5 | avg ms |
|------|-------|-------|--------|
| keyword | pending | pending | pending |
| meaning | pending | pending | pending |
| hybrid | pending | pending | pending |

Baseline pending: no eval has been run on the real repo yet. Fill this table in from the first run.
