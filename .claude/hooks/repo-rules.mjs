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
const SCROLL_LISTENER = /addEventListener\(\s*["']scroll["']/;
const OVERFLOW_X_HIDDEN = /\boverflow-x-hidden\b/;
const UNSAFE_HTML = /dangerouslySetInnerHTML/;
const OLD_AI_SDK = /\.toUIMessageStreamResponse\(|\bstepCountIs\(|\bmaxSteps\b|\bexperimental_throttle\b/;
const STREAM_TEXT = /\bstreamText\(/;
const SYSTEM_KEY = /^\s*system:/m;
const CATALOG_ONLY = [
  "next", "react", "react-dom", "typescript", "zod", "@anthropic-ai/sdk", "tailwindcss",
  "ai", "@ai-sdk/react", "@ai-sdk/anthropic", "@ai-sdk/provider", "streamdown",
  "@tanstack/react-table", "recharts", "cmdk", "nuqs",
];
const OLD_TABLE_API = /\buseReactTable\b|\bgetPaginationRowModel\b|(?<![.\w])get(?:Core|Sorted|Filtered)RowModel\(\)/;
const ERROR_FILE = /(^|\/)(global-)?error\.tsx$/;
const RESET = /\breset\b/;
const RETRY = /\bretry\b/;
const HEX_CHART_COLOR = /\s(?:fill|stroke|stopColor)=["']#[0-9a-f]{3,8}["']/i;

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

// Rule 6: Scroll. Scroll listeners re-render on every event, and overflow-x-hidden quietly
// breaks position: sticky, so catch both in app and package source.
if (APP_TS_FILE.test(relative)) {
  if (SCROLL_LISTENER.test(text)) {
    problems.push('Don\'t listen to scroll events. Use useScroll() from "motion/react" (MotionValues update the DOM without re-rendering) or CSS scroll-driven animations.');
  }
  if (OVERFLOW_X_HIDDEN.test(text)) {
    problems.push("overflow-x-hidden turns the element into a scroll container and breaks position: sticky inside it. Use overflow-x-clip (cuts the overflow, keeps sticky working).");
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

// Rule 8: Dashboards. Block TanStack Table v8 names, the old reset() error API, and hex
// colors in Recharts so tables, error boundaries and charts follow our current patterns.
if (APP_TS_FILE.test(relative)) {
  if (OLD_TABLE_API.test(text)) {
    problems.push("TanStack Table v8 API. We use v9: useTable({ features }) with tableFeatures({ ... }) and createSortedRowModel() / createFilteredRowModel() / createPaginatedRowModel().");
  }
  if (ERROR_FILE.test(relative) && RESET.test(text) && !RETRY.test(text)) {
    problems.push("Next 16.3+: error boundaries get retry() (re-fetches and re-renders). reset() only clears the error state. Use retry.");
  }
  if (text.includes("recharts") && HEX_CHART_COLOR.test(text)) {
    problems.push("Chart colors come from tokens: var(--color-<key>) from ChartContainer config, or var(--chart-N) / var(--success). Never hex.");
  }
}

if (problems.length > 0) {
  process.stderr.write(`House rules broken in ${relative}:\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  process.exit(2);
}

process.exit(0);
