// repo-rules.mjs (PostToolUse hook)
// Runs AFTER Claude edits or writes a file and checks our house rules:
// no hardcoded model ids, no secret-looking public env vars, and shared
// package versions must come from the pnpm catalog. Broken rule = exit 2.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CODE_FILE = /\.(ts|tsx|mts|js|mjs)$/;
const MODEL_STRING = /["'`]claude-[a-z0-9.-]+["'`]/;
const PUBLIC_SECRET = /NEXT_PUBLIC_\w*(SECRET|SERVICE_ROLE|PRIVATE|API_KEY|TOKEN)\w*/;
const APP_TS_FILE = /^(apps|packages)\/.+\.tsx?$/;
const OLD_MOTION_IMPORT = /from\s+["']framer-motion(?:\/[^"']*)?["']/;
const STAGGER_CHILDREN = /\bstaggerChildren\s*:/;
const UNSAFE_HTML = /dangerouslySetInnerHTML/;
const OLD_AI_SDK = /\.toUIMessageStreamResponse\(|\bstepCountIs\(|\bmaxSteps\b|\bexperimental_throttle\b/;
const STREAM_TEXT = /\bstreamText\(/;
const SYSTEM_KEY = /^\s*system:/m;
const CATALOG_ONLY = [
  "next", "react", "react-dom", "typescript", "zod", "@anthropic-ai/sdk", "tailwindcss",
  "ai", "@ai-sdk/react", "@ai-sdk/anthropic", "@ai-sdk/provider", "streamdown",
];

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

// Rule 5: Motion. The library was renamed from framer-motion to motion, and staggerChildren
// is deprecated, so catch both in app and package source before they spread.
if (APP_TS_FILE.test(relative)) {
  if (OLD_MOTION_IMPORT.test(text)) {
    problems.push('Import from "motion/react" (or "motion/react-client" in Server Components), not "framer-motion". The package was renamed; we only install motion.');
  }
  if (STAGGER_CHILDREN.test(text)) {
    problems.push('staggerChildren is deprecated. Use delayChildren: stagger(0.06) with stagger imported from "motion/react".');
  }
}

// Rule 7: AI SDK 7 and AI UI. Block raw HTML, AI SDK 5/6 names, and a streamText that
// can't be stopped, so old patterns don't creep back in.
if (APP_TS_FILE.test(relative)) {
  if (UNSAFE_HTML.test(text)) {
    problems.push("dangerouslySetInnerHTML: never render model or user text as raw HTML. Use <Response> from @repo/ui/ai/response (Streamdown sanitizes it).");
  }
  const oldApi = OLD_AI_SDK.exec(text);
  if (oldApi) {
    const name = oldApi[0].replace(/^\./, "").replace(/\($/, "");
    problems.push(`"${name}" is AI SDK 5/6. We use AI SDK 7: createUIMessageStreamResponse + toUIMessageStream, isStepCount, throttle.`);
  }
  if (STREAM_TEXT.test(text)) {
    if (!text.includes("abortSignal")) {
      problems.push("streamText without abortSignal: the Stop button won't stop the model. Pass abortSignal: req.signal.");
    }
    if (SYSTEM_KEY.test(text)) {
      problems.push('streamText "system" is deprecated in AI SDK 7. Use "instructions".');
    }
  }
}

if (problems.length > 0) {
  process.stderr.write(`House rules broken in ${relative}:\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  process.exit(2);
}

process.exit(0);
