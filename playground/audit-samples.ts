import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClaude } from "@repo/ai/client";
import { runAudit, type SourceFiles } from "@repo/ai/audit";

const SAMPLES_DIR = resolve(import.meta.dirname, "samples");

async function loadSamples(): Promise<SourceFiles> {
  const entries = await readdir(SAMPLES_DIR, { withFileTypes: true });
  const files: SourceFiles = {};
  for (const entry of entries) {
    if (entry.isFile()) {
      files[entry.name] = await readFile(resolve(SAMPLES_DIR, entry.name), "utf8");
    }
  }
  return files;
}

async function main() {
  const files = await loadSamples();
  const result = await runAudit(createClaude(), files, { onLog: console.log });

  console.log(result.report);
  console.log(`(${result.turns} turns, ${result.usage.inputTokens} in / ${result.usage.outputTokens} out tokens)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
