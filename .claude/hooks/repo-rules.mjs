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
const IMAGE_PRIORITY = /<Image[^>]*\spriority\b/;
const RAW_IMG = /<img\s/;
const SATORI_FILE = /(^|\/)(opengraph|twitter)-image\.tsx$/;
const MOBILE_FILE = /^apps\/mobile\/.+\.tsx?$/;
const SHARED_FILE = /^packages\/ai\/src\/shared\/.+\.tsx?$/;
const IMPORT_SPECIFIER = /\b(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;
const WEB_ONLY_MODULE = /^(?:react-dom|next)(?:\/|$)/;
const REPO_UI_MODULE = /^@repo\/ui(?:\/|$)/;
const REPO_AI_MODULE = /^@repo\/ai(?:\/|$)/;
// A "<" right after a word character is a TypeScript generic (useState<a>), not JSX.
const WEB_JSX_TAG = /(?<![\w$])<(?:div|span|p|button|a)(?=[\s/>])/;
const RN_JS_ANIMATION = /import\s+(?:type\s+)?\{[^}]*\b(?:Animated|PanResponder)\b[^}]*\}\s*from\s*["']react-native["']/;
const OLD_WORKLET_CALL = /\brunOn(?:JS|UI)\(/;
const GESTURE_V2_BUILDER = /\bGesture\.(?:Pan|Tap|LongPress)\(/;
const GORHOM_SHEET = /from\s*["']@gorhom\/bottom-sheet(?:\/[^"']*)?["']/;
const HAPTICS_CALL = /\bHaptics\./;
// Where code runs on the UI thread: a "worklet" directive or a gesture's onUpdate( callback.
const UI_THREAD_START = /["']worklet["']|\bonUpdate\(/g;
const MOBILE_SRC_FILE = /^apps\/mobile\/src\/.+\.tsx?$/;
const USE_CHAT_CALL = /\buseChat\s*[<(]/;
const RESUME_TRUE = /\bresume\s*:\s*true\b/;
const LINE_COMMENT = /^\s*\/\/.*$/gm;
// A typed address inside a string: localhost, 127.0.0.1, 192.168.x.x or 10.x.x.x.
const HARDCODED_ADDRESS =
  /["'`][^"'`\n]*(?:https?:\/\/(?:localhost|127\.0\.0\.1)|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)[^"'`\n]*["'`]/;
const MARKDOWN_LIB = /^(?:streamdown|react-markdown|react-native-markdown-display)(?:\/|$)/;
// Value imports only: "import type" is fine because it is erased from the bundle.
const MODEL_CALL_IMPORT = /import\s+(?!type\b)\{[^}]*\b(?:streamText|generateText|tool)\b[^}]*\}\s*from\s*["']ai["']/;
const AI_SDK_PROVIDER_IMPORT =
  /import\s+(?!type\b)[^"';]*?from\s*["'](?:@anthropic-ai\/sdk|openai|@ai-sdk\/(?:anthropic|openai))(?:\/[^"']*)?["']/;
const NON_PUBLIC_ENV =/\bprocess\.env\.(?!EXPO_PUBLIC_)\w+/;
const EXPO_PUBLIC_SECRET = /EXPO_PUBLIC_\w*(?:KEY|SECRET|TOKEN|SERVICE_ROLE)\w*/;

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

// Rule 9: Images. next/image's priority prop is deprecated in Next 16 (use preload), and a raw <img>
// skips sizing and lazy loading. The opengraph-image and twitter-image files are exempt: Satori needs <img>.
if (APP_TS_FILE.test(relative)) {
  if (IMAGE_PRIORITY.test(text)) {
    problems.push('Next 16 deprecated priority on next/image. Use preload (or fetchPriority="high" / loading="eager").');
  }
  if (RAW_IMG.test(text) && !SATORI_FILE.test(relative)) {
    problems.push("Use next/image (sizes, lazy loading, no layout shift).");
  }
}

// Rule 10: Mobile. The phone bundle must not get web or server code, and the app can't keep secrets.
// packages/ai/src/shared is imported by web, server AND the phone, so it may only import itself.
if (MOBILE_FILE.test(relative)) {
  const specifiers = [...text.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);
  if (specifiers.some((spec) => WEB_ONLY_MODULE.test(spec) || (REPO_UI_MODULE.test(spec) && !spec.endsWith(".css")))) {
    problems.push("Web-only. In apps/mobile use react-native primitives and Uniwind classes.");
  }
  if (specifiers.some((spec) => REPO_AI_MODULE.test(spec) && spec !== "@repo/ai/shared")) {
    problems.push("Server code breaks the phone bundle. Import from @repo/ai/shared.");
  }
  if (WEB_JSX_TAG.test(text)) {
    problems.push("Use View / Text / Pressable / Link from expo-router.");
  }
  // app.config.ts runs on the build machine and never ships in the app, so it may read APP_VARIANT.
  if (NON_PUBLIC_ENV.test(text) && relative !== "apps/mobile/app.config.ts") {
    problems.push("Only EXPO_PUBLIC_ vars reach the app, and they are public. Secrets stay on the server.");
  }
  if (EXPO_PUBLIC_SECRET.test(text)) {
    problems.push("This looks like a secret. Anything in the app can be read by anyone.");
  }
}

// Rule 11: Native UI. Animations and gestures must run on the UI thread (Reanimated 4, Gesture Handler 3),
// and the triage sheet is a native formSheet route, not a sheet library (ADR 0010).
if (MOBILE_FILE.test(relative)) {
  if (RN_JS_ANIMATION.test(text)) {
    problems.push("Use react-native-reanimated / gesture-handler: they run on the UI thread.");
  }
  if (OLD_WORKLET_CALL.test(text)) {
    problems.push("Old Reanimated name. Use scheduleOnRN / scheduleOnUI from react-native-worklets.");
  }
  if (GESTURE_V2_BUILDER.test(text)) {
    problems.push("Gesture Handler 3: use usePanGesture / useTapGesture / useLongPressGesture.");
  }
  if (GORHOM_SHEET.test(text)) {
    problems.push("Use the native formSheet route (ADR 0010).");
  }
  // Simple check: look at the next 800 characters after a "worklet" / onUpdate( start. A Haptics call there
  // without a scheduleOnRN is flagged. It can be a false positive if the callback ended early; the message says how to fix it.
  const hapticsOnUiThread = [...text.matchAll(UI_THREAD_START)].some((start) => {
    const window = text.slice(start.index, start.index + 800);
    return HAPTICS_CALL.test(window) && !window.includes("scheduleOnRN");
  });
  if (hapticsOnUiThread) {
    problems.push("Haptics from the UI thread: wrap in scheduleOnRN and fire once.");
  }
}

// Rule 12: AI on mobile. Chat must stream (expo/fetch), models run on the server, and no address is typed by hand.
// api-url.ts may mention addresses in its comments; they are removed before checking.
if (MOBILE_SRC_FILE.test(relative)) {
  const specifiers = [...text.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]);
  if (USE_CHAT_CALL.test(text) && !text.includes("expo/fetch") && !text.includes("createAskTransport")) {
    problems.push("Mobile chat needs a streaming fetch: use createAskTransport() from @/lib/ask.");
  }
  if (USE_CHAT_CALL.test(text) && RESUME_TRUE.test(text)) {
    problems.push("resume uses document visibility (web only).");
  }
  const code = relative === "apps/mobile/src/lib/api-url.ts" ? text.replace(LINE_COMMENT, "") : text;
  if (HARDCODED_ADDRESS.test(code)) {
    problems.push("Use apiUrl() from @/lib/api-url.");
  }
  if (specifiers.some((spec) => MARKDOWN_LIB.test(spec))) {
    problems.push("Use components/chat/markdown-lite.tsx (no web or unmaintained markdown libs).");
  }
  if (MODEL_CALL_IMPORT.test(text) || AI_SDK_PROVIDER_IMPORT.test(text)) {
    problems.push("Model calls run on the server (/api/chat). The app never holds an AI key.");
  }
}

if (SHARED_FILE.test(relative)) {
  const sharedDir = path.posix.dirname(relative);
  const staysInside = (spec) =>
    spec.startsWith(".") && `${path.posix.normalize(path.posix.join(sharedDir, spec))}/`.startsWith("packages/ai/src/shared/");
  if ([...text.matchAll(IMPORT_SPECIFIER)].some((match) => !staysInside(match[1]))) {
    problems.push("shared must stay pure TypeScript (web, server and React Native).");
  }
}

if (problems.length > 0) {
  process.stderr.write(`House rules broken in ${relative}:\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  process.exit(2);
}

process.exit(0);
