// repo-rules.mjs (PostToolUse hook)
// Runs AFTER Claude edits or writes a file and checks our house rules:
// no hardcoded model ids, no secret-looking public env vars, and shared
// package versions must come from the pnpm catalog. Broken rule = exit 2.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CODE_FILE = /\.(ts|tsx|mts|js|mjs)$/;
const MODEL_STRING = /["'`]claude-[a-z0-9.-]+["'`]/;
const PUBLIC_SECRET = /NEXT_PUBLIC_\w*(SECRET|SERVICE_ROLE|PRIVATE|API_KEY|TOKEN)\w*/;
const CATALOG_ONLY = ["next", "react", "react-dom", "typescript", "zod", "@anthropic-ai/sdk", "tailwindcss"];

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = input.tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const absolute = path.resolve(projectDir, filePath);
const relative = path.relative(projectDir, absolute).split(path.sep).join("/");

const outside = relative.startsWith("..") || path.isAbsolute(relative);
const generated = /(^|\/)(node_modules|\.next)\//.test(relative);
if (outside || generated || !existsSync(absolute)) process.exit(0);

const text = readFileSync(absolute, "utf8");
const problems = [];

if (CODE_FILE.test(relative)) {
  if (relative !== "packages/ai/src/models.ts" && MODEL_STRING.test(text)) {
    problems.push("Hardcoded Claude model id found. Import MODELS from @repo/ai/models instead.");
  }
  if (PUBLIC_SECRET.test(text) && !text.includes("repo-rules: allow-secret-samples")) {
    problems.push("Secret-looking NEXT_PUBLIC_ variable found (it would ship to the browser). Move it to a server-only env var.");
  }
}

if (path.posix.basename(relative) === "package.json" && relative !== "package.json") {
  try {
    const pkg = JSON.parse(text);
    for (const section of ["dependencies", "devDependencies"]) {
      for (const name of CATALOG_ONLY) {
        const version = pkg[section]?.[name];
        if (version !== undefined && version !== "catalog:") {
          problems.push(`${name} in ${section} is "${version}". Use "catalog:" so the version lives in pnpm-workspace.yaml.`);
        }
      }
    }
  } catch {
    problems.push("package.json is not valid JSON. Fix the syntax.");
  }
}

if (problems.length > 0) {
  process.stderr.write(`House rules broken in ${relative}:\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  process.exit(2);
}

process.exit(0);
