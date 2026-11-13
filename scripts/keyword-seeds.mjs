// keyword-seeds.mjs: asks Google's public autocomplete for ideas, one seed + one letter at a time.
// Run: node scripts/keyword-seeds.mjs
// This endpoint is unofficial. If it fails or blocks us, we stop politely and save what we have.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEEDS = [
  "lovable security",
  "supabase rls",
  "supabase service role key",
  "vibe coded app",
  "bolt.new app",
  "is lovable secure",
  "ai generated code security",
  "fix lovable app",
];
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const MAX_CALLS = 150;
const PAUSE_MS = 300;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outFile = path.join(root, "docs/product/keywords/autocomplete.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Letter by letter across all seeds, so a stop at MAX_CALLS leaves every seed with the same coverage.
const queries = LETTERS.flatMap((letter) => SEEDS.map((seed) => ({ seed, query: `${seed} ${letter}` }))).slice(0, MAX_CALLS);

const results = [];
let stopReason = null;

for (const [index, { seed, query }] of queries.entries()) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, { headers: { "user-agent": "keyword-seeds-script" } });
    if (!response.ok) {
      stopReason = `Google answered ${response.status} on call ${index + 1} ("${query}").`;
      break;
    }
    const data = await response.json();
    const suggestions = Array.isArray(data?.[1]) ? data[1].filter((item) => typeof item === "string") : null;
    if (!suggestions) {
      stopReason = `Unexpected answer on call ${index + 1} ("${query}"): not the format we expect.`;
      break;
    }
    results.push({ seed, query, suggestions });
  } catch (error) {
    stopReason = `Request failed on call ${index + 1} ("${query}"): ${error instanceof Error ? error.message : "unknown error"}.`;
    break;
  }
  await sleep(PAUSE_MS);
}

const unique = [...new Set(results.flatMap((result) => result.suggestions))].sort();

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(
  outFile,
  `${JSON.stringify(
    {
      source: "suggestqueries.google.com (unofficial), client=firefox, hl=en",
      collectedAt: new Date().toISOString(),
      calls: results.length,
      completed: stopReason === null,
      stopReason,
      uniqueCount: unique.length,
      unique,
      results,
    },
    null,
    2,
  )}\n`,
);

console.log(`Calls made: ${results.length} of ${queries.length}`);
console.log(`Unique suggestions: ${unique.length}`);
console.log(`Saved: ${path.relative(root, outFile)}`);
if (stopReason) {
  console.log(`Stopped early. ${stopReason}`);
  console.log("This endpoint is unofficial and may block scripts. Do the rest by hand in the browser.");
  process.exitCode = 1;
}
