import assert from "node:assert/strict";
import { test } from "node:test";
import { assertCanFinish, assertChunkLimit, ChunkLimitError, IndexTooSlowError, costUsd, devSampleLimit, groupsOf, isStale, MAX_CHUNKS, pickSample, planEmbeddings } from "./index-plan.ts";

test("the dev sample limit is ignored in production and for bad values", () => {
  assert.equal(devSampleLimit(60, "development"), 60);
  assert.equal(devSampleLimit(60, undefined), 60);
  assert.equal(devSampleLimit(60, "production"), 0);
  assert.equal(devSampleLimit(0, "development"), 0);
  assert.equal(devSampleLimit(-5, "development"), 0);
  assert.equal(devSampleLimit(Number.NaN, "development"), 0);
});

test("the sample takes src/ first, docs last, and picks the same chunks every time", () => {
  const chunks = [
    { path: "README.md", id: 1 },
    { path: "package.json", id: 2 },
    { path: "src/a.ts", id: 3 },
    { path: "docs/guide.md", id: 4 },
    { path: "apps/web/src/b.ts", id: 5 },
    { path: "src/c.ts", id: 6 },
  ];
  const first = pickSample(chunks, 4);
  assert.deepEqual(first.kept.map((c) => c.id), [3, 5, 6, 2]);
  assert.equal(first.leftOut, 2);
  assert.deepEqual(pickSample(chunks, 4).kept, first.kept); // stable
  assert.equal(pickSample(chunks, 2).kept.every((c) => /src\//.test(c.path)), true);
});

test("a run that can't finish in time at the tokens-per-minute budget is refused before anything is paid", () => {
  const chunk350 = "x".repeat(350); // about 100 tokens
  const small = Array.from({ length: 60 }, () => chunk350); // 6,000 tokens: fits in the first minute
  assert.doesNotThrow(() => assertCanFinish(small, 8000, 0));
  const medium = Array.from({ length: 300 }, () => chunk350); // 30,000 tokens: about 2.75 more minutes
  assert.doesNotThrow(() => assertCanFinish(medium, 8000, 0));
  const big = Array.from({ length: 1000 }, () => chunk350); // 100,000 tokens: about 11.5 more minutes
  assert.throws(() => assertCanFinish(big, 8000, 0), IndexTooSlowError);
  assert.throws(() => assertCanFinish(medium, 8000, 200_000), IndexTooSlowError); // time already spent counts
  assert.doesNotThrow(() => assertCanFinish(big, 8_000_000, 0)); // a paid account's budget
});

test("no limit, or a limit above the chunk count, keeps everything", () => {
  const chunks = [{ path: "src/a.ts" }, { path: "src/b.ts" }];
  assert.deepEqual(pickSample(chunks, 0), { kept: chunks, leftOut: 0 });
  assert.deepEqual(pickSample(chunks, 2), { kept: chunks, leftOut: 0 });
});

const chunk = (contentHash: string, id = contentHash) => ({ contentHash, id });

test("known chunks are split from new ones, in order, and nothing is lost", () => {
  const chunks = [chunk("a"), chunk("b"), chunk("c"), chunk("d")];
  const { known, fresh } = planEmbeddings(chunks, new Set(["b", "d"]));
  assert.deepEqual(known.map((c) => c.id), ["b", "d"]);
  assert.deepEqual([...fresh.keys()], ["a", "c"]);
});

test("identical new chunks share one embedding: one entry per hash, every copy kept", () => {
  const { known, fresh } = planEmbeddings([chunk("a", "1"), chunk("b", "2"), chunk("a", "3")], new Set());
  assert.equal(known.length, 0);
  assert.deepEqual([...fresh.keys()], ["a", "b"]); // 2 texts to pay for...
  assert.deepEqual(fresh.get("a")?.map((c) => c.id), ["1", "3"]); // ...3 rows to save
});

test("nothing changed: everything is known, nothing is new (a re-index costs 0)", () => {
  const chunks = [chunk("a"), chunk("b")];
  const { known, fresh } = planEmbeddings(chunks, new Set(["a", "b"]));
  assert.equal(known.length, 2);
  assert.equal(fresh.size, 0);
});

test("groups keep their order and the last one holds the rest", () => {
  assert.deepEqual(groupsOf([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(groupsOf([], 2), []);
});

test("cost is tokens / 1M times the price, rounded to 4 decimals", () => {
  assert.equal(costUsd(0), 0);
  assert.equal(costUsd(1_000_000), 0.12);
  assert.equal(costUsd(2_500_000), 0.3);
  assert.equal(costUsd(1_234_567), 0.1481);
  assert.equal(costUsd(100), 0); // too small for 4 decimals
});

test("20,000 chunks are fine, 20,001 fail with a clear error", () => {
  assert.equal(MAX_CHUNKS, 20_000);
  assert.doesNotThrow(() => assertChunkLimit(20_000));
  assert.throws(() => assertChunkLimit(20_001), ChunkLimitError);
});

test("an index is stale after 15 minutes, not before", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  assert.equal(isStale("2026-11-24T11:45:01Z", now), false); // 14:59
  assert.equal(isStale("2026-11-24T11:44:59Z", now), true); // 15:01
  assert.equal(isStale(null, now), false);
  assert.equal(isStale("not a date", now), false);
});
