// guard-secrets.mjs (PreToolUse hook)
// Runs BEFORE Claude reads, edits, writes or runs a command.
// It says "no" to real .env files, real-looking API keys, and dangerous
// commands (git push, git reset --hard, git clean -f, rm -rf on big folders).
import { readFileSync } from "node:fs";

const ENV_FILE = /(^|[\\/])\.env(?!\.example\b)(\.[\w.-]+)?$/;
const ENV_IN_COMMAND = /\.env(?!\.example\b)(\.[\w.-]+)?\b/;
const REAL_KEY = /sk-ant-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{20,}/;
const DANGEROUS_RM_TARGETS = new Set(["/", "/*", "~", "~/", "~/*", ".", "./", "./*", "..", "../", "../*"]);

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

// rm is dangerous when it is recursive AND points at /, ~, . or ..
function hasDangerousRm(command) {
  for (const part of command.split(/&&|\|\||[;|\n]/)) {
    const words = part.trim().split(/\s+/);
    const rmAt = words.indexOf("rm");
    if (rmAt === -1) continue;
    const args = words.slice(rmAt + 1);
    const recursive = args.some((a) => /^-[a-zA-Z]*[rR]/.test(a) || a === "--recursive");
    const risky = args.some((a) => DANGEROUS_RM_TARGETS.has(a.replace(/^["']|["']$/g, "")));
    if (recursive && risky) return true;
  }
  return false;
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const tool = input.tool_name;
const toolInput = input.tool_input ?? {};

if (["Read", "Edit", "Write"].includes(tool)) {
  const filePath = String(toolInput.file_path ?? "").replace(/\\/g, "/");
  if (ENV_FILE.test(filePath)) {
    deny("That is a real .env file, so I can't touch it. Use .env.example to show which variables are needed.");
  }
}

if (tool === "Write" || tool === "Edit") {
  const text = String(tool === "Write" ? (toolInput.content ?? "") : (toolInput.new_string ?? ""));
  if (REAL_KEY.test(text)) {
    deny("This looks like a real API key. Put a placeholder like your-key-here in the file and keep the real key in your own .env.local.");
  }
}

if (tool === "Bash") {
  const command = String(toolInput.command ?? "");
  if (ENV_IN_COMMAND.test(command)) {
    deny("That command touches a real .env file. Use .env.example instead, and ask Asim to edit real env files himself.");
  }
  if (/\bgit\s+push\b/.test(command)) {
    deny("Asim pushes manually, so don't run git push. Commit if asked, then tell Asim it is ready to push.");
  }
  if (/\bgit\s+reset\s+--hard\b/.test(command)) {
    deny("git reset --hard throws away work. Use git stash or git restore on a single file instead.");
  }
  if (/\bgit\s+clean\s+(-\w*f|--force)/.test(command)) {
    deny("git clean -f deletes untracked files for good. List them with git status and remove specific files only if Asim agrees.");
  }
  if (hasDangerousRm(command)) {
    deny("Deleting /, ~, . or .. recursively is far too risky. Delete only the specific folder you created.");
  }
}

process.exit(0);
