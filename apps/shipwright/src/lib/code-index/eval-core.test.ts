import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTable, missesOf, parseCases, rankOf, scoreMode, type EvalCase, type ModeRun } from "./eval-core.ts";

test("cases: one expected path or a list, with ./ and backslashes tidied", () => {
  assert.deepEqual(parseCases([{ q: "where is auth", expect: "./src/lib/auth.ts" }, { q: "x", expect: ["a/b.ts", "a\\c.ts"] }]), [
    { q: "where is auth", expect: ["src/lib/auth.ts"] },
    { q: "x", expect: ["a/b.ts", "a/c.ts"] },
  ]);
});

test("a bad cases file says where it is wrong and what is expected", () => {
  assert.throws(() => parseCases([]), /at least one case/);
  assert.throws(() => parseCases("nope"), /not valid/);
  assert.throws(() => parseCases([{ q: "", expect: "a.ts" }]), /q must not be empty/);
  assert.throws(() => parseCases([{ q: "ok" }]), /\{ "q": "\.\.\.", "expect"/);
  assert.throws(() => parseCases([{ q: "ok", expect: [] }]), /not valid at 0\.expect/);
});

test("rank is the 1-based position of the first expected path, or null", () => {
  assert.equal(rankOf(["a.ts", "b.ts", "c.ts"], ["a.ts"]), 1);
  assert.equal(rankOf(["a.ts", "b.ts", "c.ts"], ["c.ts", "b.ts"]), 2); // the first one that matches counts
  assert.equal(rankOf(["a.ts", "a.ts", "b.ts"], ["b.ts"]), 3); // two chunks of one file are two results
  assert.equal(rankOf(["a.ts"], ["z.ts"]), null);
  assert.equal(rankOf([], ["a.ts"]), null);
  assert.equal(rankOf(["./a.ts"], ["a.ts"]), 1);
});

const cases: EvalCase[] = [
  { q: "one", expect: ["a.ts"] },
  { q: "two", expect: ["b.ts"] },
  { q: "three", expect: ["c.ts"] },
  { q: "four", expect: ["d.ts"] },
];
const runs: ModeRun[] = [
  { paths: ["a.ts", "x.ts"], ms: 10 }, // first
  { paths: ["x.ts", "y.ts", "b.ts"], ms: 20 }, // third
  { paths: ["x.ts", "y.ts", "z.ts", "w.ts", "v.ts", "c.ts"], ms: 30 }, // sixth: outside the top 5
  { paths: [], ms: 40 }, // nothing found
];

test("hit@1 needs first place, hit@5 needs the top five, avg ms is the mean", () => {
  assert.deepEqual(scoreMode(cases, runs), { n: 4, hit1: 1, hit5: 2, avgMs: 25 });
});

test("an empty eval scores zero without dividing by zero", () => {
  assert.deepEqual(scoreMode([], []), { n: 0, hit1: 0, hit5: 0, avgMs: 0 });
});

test("misses: not-first cases, with the top 3 paths that came back instead", () => {
  assert.deepEqual(missesOf(cases, runs), [
    { q: "two", expect: ["b.ts"], rank: 3, got: ["x.ts", "y.ts", "b.ts"] },
    { q: "three", expect: ["c.ts"], rank: null, got: ["x.ts", "y.ts", "z.ts"] },
    { q: "four", expect: ["d.ts"], rank: null, got: [] },
  ]);
});

test("the table lines up, shows percentages, and says why a mode did not run", () => {
  const table = formatTable([
    { mode: "keyword", score: { n: 10, hit1: 7, hit5: 9, avgMs: 12.4 } },
    { mode: "meaning", score: null, note: "no embeddings key" },
  ]);
  const lines = table.split("\n");
  assert.equal(lines.length, 5);
  assert.match(lines[0] ?? "", /^mode\s+\| hit@1\s+\| hit@5\s+\| avg ms$/);
  assert.match(lines[2] ?? "", /^keyword \| 7\/10 \(70%\) \| 9\/10 \(90%\) \| 12$/);
  assert.match(lines[3] ?? "", /^meaning \| -/);
  assert.equal(lines[4], "(meaning: no embeddings key)");
  // every table line has its separators in the same columns
  const bars = (line: string) => [...line].flatMap((char, index) => (char === "|" ? [index] : []));
  assert.deepEqual(bars(lines[2] ?? ""), bars(lines[0] ?? ""));
});
