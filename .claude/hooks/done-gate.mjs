// done-gate.mjs (Stop hook)
// Runs when Claude thinks it is finished. If any .ts/.tsx/.json file changed,
// it runs "pnpm check-types". If that fails, Claude is told to keep working.
// It never loops: if it already blocked once, it lets Claude stop.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

if (input.stop_hook_active === true) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

// -uall lists files inside brand-new folders too, not just the folder name.
const status = spawnSync("git", ["status", "--porcelain", "-uall"], { cwd, encoding: "utf8" });
const changed = (status.stdout ?? "")
  .split("\n")
  .map((line) => line.slice(3).replace(/^.* -> /, "").replace(/^"|"$/g, ""))
  .filter((file) => /\.(ts|tsx|json)$/.test(file));

if (changed.length === 0) process.exit(0);

const run = spawnSync("pnpm", ["check-types"], {
  cwd,
  encoding: "utf8",
  timeout: 170_000,
  env: { ...process.env, SKIP_ENV_VALIDATION: "1" },
});

if (run.status === 0) process.exit(0);

const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
const note = run.error ? `(${run.error.message})\n` : "";
const tail = output.split("\n").slice(-40).join("\n");

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: `pnpm check-types fails, so the task is not done. Fix the root cause (no "any", no @ts-ignore):\n${note}${tail}`,
  }),
);
process.exit(0);
