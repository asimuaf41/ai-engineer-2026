// The scoring side of the code search eval (scripts/eval-code-search.ts): reading the cases, ranking results, and printing the
// table. Pure: no I/O, so it is unit-tested. The script does the database and embedding calls.
import { z } from "zod";

export const MODES = ["keyword", "meaning", "hybrid"] as const;
export type Mode = (typeof MODES)[number];

// One case: a question (or an exact name) and the path of the file that should come back. A case can list several acceptable paths.
const CaseSchema = z.object({
  q: z.string().trim().min(1, "q must not be empty"),
  expect: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
});

export type EvalCase = { q: string; expect: string[] };

export function parseCases(json: unknown): EvalCase[] {
  const parsed = z.array(CaseSchema).min(1, "the file needs at least one case").safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue ? issue.path.join(".") : "";
    throw new Error(`The cases file is not valid${where ? ` at ${where}` : ""}: ${issue?.message ?? "unknown problem"}. Expected: [{ "q": "...", "expect": "src/path.ts" }, ...]`);
  }
  return parsed.data.map((item) => ({ q: item.q, expect: (Array.isArray(item.expect) ? item.expect : [item.expect]).map(normalizePath) }));
}

export const normalizePath = (path: string): string => path.replace(/^\.\//, "").replace(/\\/g, "/");

// What one search returned: the file paths in order (the top 5), and how long it took.
export type ModeRun = { paths: string[]; ms: number };

// 1-based position of the first result whose path is expected, or null when none of the results is.
export function rankOf(paths: readonly string[], expect: readonly string[]): number | null {
  const wanted = new Set(expect.map(normalizePath));
  const index = paths.findIndex((path) => wanted.has(normalizePath(path)));
  return index === -1 ? null : index + 1;
}

export type ModeScore = { n: number; hit1: number; hit5: number; avgMs: number };

// hit@1: the expected path is the very first result. hit@5: it is among the first five. avgMs: mean time per search.
export function scoreMode(cases: readonly EvalCase[], runs: readonly ModeRun[]): ModeScore {
  let hit1 = 0;
  let hit5 = 0;
  let totalMs = 0;
  cases.forEach((item, index) => {
    const run = runs[index];
    if (!run) return;
    totalMs += run.ms;
    const rank = rankOf(run.paths.slice(0, 5), item.expect);
    if (rank === 1) hit1++;
    if (rank !== null) hit5++;
  });
  return { n: cases.length, hit1, hit5, avgMs: cases.length === 0 ? 0 : totalMs / cases.length };
}

const pct = (part: number, whole: number) => (whole === 0 ? "0%" : `${Math.round((part / whole) * 100)}%`);

export type TableRow = { mode: string; score: ModeScore | null; note?: string };

// mode | hit@1 | hit@5 | avg ms. A mode that could not run (no embeddings key) shows a dash and says why under the table.
export function formatTable(rows: readonly TableRow[]): string {
  const cells = rows.map(({ mode, score }) => [
    mode,
    score ? `${score.hit1}/${score.n} (${pct(score.hit1, score.n)})` : "-",
    score ? `${score.hit5}/${score.n} (${pct(score.hit5, score.n)})` : "-",
    score ? String(Math.round(score.avgMs)) : "-",
  ]);
  const header = ["mode", "hit@1", "hit@5", "avg ms"];
  const widths = header.map((title, column) => Math.max(title.length, ...cells.map((row) => (row[column] ?? "").length)));
  const line = (row: string[]) => row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ").trimEnd();
  const lines = [line(header), widths.map((width) => "-".repeat(width)).join("-+-"), ...cells.map(line)];
  for (const row of rows) if (row.note) lines.push(`(${row.mode}: ${row.note})`);
  return lines.join("\n");
}

export type Miss = { q: string; expect: string[]; rank: number | null; got: string[] };

// Cases where the expected path was not first. `rank` null = not in the top 5 at all (a real miss); a number = found, but lower down.
// `got` is the top few paths that came back instead.
export function missesOf(cases: readonly EvalCase[], runs: readonly ModeRun[], top = 3): Miss[] {
  const misses: Miss[] = [];
  cases.forEach((item, index) => {
    const run = runs[index];
    if (!run) return;
    const rank = rankOf(run.paths.slice(0, 5), item.expect);
    if (rank === 1) return;
    misses.push({ q: item.q, expect: item.expect, rank, got: run.paths.slice(0, top) });
  });
  return misses;
}
