// Code search eval: for each case in evals/code-search.json, runs keyword-only, meaning-only and hybrid search on one indexed app
// and prints hit@1 / hit@5 / avg ms per mode, then the cases hybrid got wrong.
//
//   pnpm --filter shipwright eval:search -- --app <appId>           (cases file: evals/code-search.json)
//   pnpm --filter shipwright eval:search -- --app <appId> --cases evals/other.json
//
// A local dev script. It uses the ADMIN client (it reads the app's chunks for any workspace), so it refuses to run in
// production. It only READS the database. Each question is embedded once and reused for the meaning and hybrid runs.
// The three modes call db.searchChunks (the same SQL function the Code page uses):
//   keyword = text only (no embedding)   meaning = embedding only (text "")   hybrid = both.
// A hit is the expected path among the first 1 / 5 results (results are chunks, so two chunks of one file are two results).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { isEmbeddingConfigured } from "../src/env";
import { embedQuery } from "../src/lib/ai/embeddings";
import { latestReadyIndex, searchChunks } from "../src/lib/code-index/db";
import { formatTable, missesOf, MODES, parseCases, rankOf, scoreMode, type EvalCase, type Mode, type ModeRun } from "../src/lib/code-index/eval-core";
import { createAdminClient } from "../src/lib/supabase/admin";

const TOP = 5;

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const rankFor = (item: EvalCase, run: ModeRun | undefined): number | null => (run ? rankOf(run.paths.slice(0, TOP), item.expect) : null);

async function timed<T>(work: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const started = performance.now();
  const value = await work();
  return { value, ms: performance.now() - started };
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") fail("Refusing to run: this is a local dev script that uses the admin client, and NODE_ENV is production.");

  // pnpm may pass the "--" of "pnpm run x -- --app ..." on to the script: ignore it.
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: { app: { type: "string" }, cases: { type: "string", default: "evals/code-search.json" } },
  });
  const appId = z.uuid().safeParse(values.app);
  if (!appId.success) fail("Usage: pnpm --filter shipwright eval:search -- --app <appId>   (the app's id, a uuid)");

  const casesPath = path.resolve(process.cwd(), values.cases ?? "evals/code-search.json");
  if (!existsSync(casesPath)) {
    fail(`Cases file not found: ${path.relative(process.cwd(), casesPath)}\nCreate it as a list like: [{ "q": "where do we check the user paid?", "expect": "src/lib/billing/check-paid.ts" }]`);
  }
  let cases: EvalCase[];
  try {
    cases = parseCases(JSON.parse(readFileSync(casesPath, "utf8")));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not read the cases file.");
  }

  // The app and its workspace, straight from the database (admin client).
  const app = await createAdminClient().from("apps").select("org_id, repo_full_name").eq("id", appId.data).maybeSingle();
  if (app.error) fail(`Could not read the app (database code ${app.error.code}).`);
  if (!app.data) fail("No app with that id in this database. Is the local stack running (pnpm db:start) and is the id from this database?");
  const orgId = app.data.org_id;
  const index = await latestReadyIndex({ orgId, appId: appId.data });
  if (!index) fail("This app has no ready index yet. Run 'Index my code' first.");

  const embeddingsOn = isEmbeddingConfigured();
  console.log(`\nCode search eval: ${app.data.repo_full_name} @ ${index.commitSha.slice(0, 7)} · ${cases.length} cases · top ${TOP}`);
  if (!embeddingsOn) console.log("VOYAGE_API_KEY is not set: only keyword search can run.");

  const runs: Record<Mode, ModeRun[]> = { keyword: [], meaning: [], hybrid: [] };
  const search = async (text: string, embedding?: number[]) =>
    (await searchChunks({ orgId, appId: appId.data, text, embedding, limit: TOP })).map((hit) => hit.path);

  for (const item of cases) {
    const keyword = await timed(() => search(item.q));
    runs.keyword.push({ paths: keyword.value, ms: keyword.ms });
    if (!embeddingsOn) continue;

    // Embedding the question is part of what a person waits for, so its time counts for meaning and hybrid. A failure stops
    // the eval: quietly falling back to keywords would make the meaning and hybrid numbers lie.
    const embedded = await timed(() => embedQuery(item.q));
    const meaning = await timed(() => search("", embedded.value));
    runs.meaning.push({ paths: meaning.value, ms: meaning.ms + embedded.ms });
    const hybrid = await timed(() => search(item.q, embedded.value));
    runs.hybrid.push({ paths: hybrid.value, ms: hybrid.ms + embedded.ms });
  }

  const scores = Object.fromEntries(MODES.map((mode) => [mode, runs[mode].length === cases.length ? scoreMode(cases, runs[mode]) : null])) as Record<
    Mode,
    ReturnType<typeof scoreMode> | null
  >;
  console.log(`\n${formatTable(MODES.map((mode) => ({ mode, score: scores[mode], note: scores[mode] ? undefined : "needs VOYAGE_API_KEY" })))}`);
  console.log("(avg ms for meaning and hybrid includes embedding the question)");

  if (scores.hybrid) {
    const misses = missesOf(cases, runs.hybrid);
    const missing = misses.filter((miss) => miss.rank === null);
    const late = misses.filter((miss) => miss.rank !== null);
    console.log(`\nHybrid misses (expected file not in the top ${TOP}): ${missing.length}`);
    for (const miss of missing) {
      console.log(`  - "${miss.q}"\n      expected ${miss.expect.join(" or ")}\n      got      ${miss.got.length ? miss.got.join("\n               ") : "(nothing)"}`);
    }
    if (late.length > 0) {
      console.log(`\nFound, but not first: ${late.length}`);
      for (const miss of late) console.log(`  - "${miss.q}"  -> rank ${miss.rank} (expected ${miss.expect.join(" or ")}; first was ${miss.got[0] ?? "-"})`);
    }
  }

  // Save the run. evals/results/ is git-ignored, except the one baseline file.
  const resultsDir = path.resolve(process.cwd(), "evals/results");
  mkdirSync(resultsDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  let file = path.join(resultsDir, `code-search-${day}.json`);
  for (let n = 2; existsSync(file); n++) file = path.join(resultsDir, `code-search-${day}-${n}.json`);
  const perMode = (item: EvalCase, run: ModeRun | undefined) => (run ? { rank: rankFor(item, run), paths: run.paths } : null);
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        date: new Date().toISOString(),
        repo: app.data.repo_full_name,
        commit: index.commitSha,
        cases: cases.length,
        top: TOP,
        embeddings: embeddingsOn,
        modes: scores,
        perCase: cases.map((item, i) => ({
          q: item.q,
          expect: item.expect,
          keyword: perMode(item, runs.keyword[i]),
          meaning: perMode(item, runs.meaning[i]),
          hybrid: perMode(item, runs.hybrid[i]),
        })),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\nSaved ${path.relative(process.cwd(), file)}\n`);
}

main().catch((error: unknown) => {
  // Never print the error object itself: it could carry request details. A short name and status are enough.
  const status = (error as { status?: unknown } | null)?.status;
  fail(`The eval stopped: ${error instanceof Error ? error.name : "unknown error"}${typeof status === "number" ? ` (status ${status})` : ""}.`);
});
