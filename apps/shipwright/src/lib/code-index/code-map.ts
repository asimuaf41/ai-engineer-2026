// The "code map" of one file: what kind of file it is, which symbols it declares, what it imports and which env vars it
// reads. Pure: no I/O. Files are parsed with oxc-parser (not the TypeScript compiler API). A file that does not parse is
// not an error: it just has no symbols/imports, and the chunker falls back to plain line windows for it.
//
// Secrets are masked first (redactSecrets), so nothing below ever sees or returns the original text.
import { createHash } from "node:crypto";
import { parseSync, type ParseResult } from "oxc-parser";
import { isEnvFilePath, redactSecrets } from "./redact.ts";
import type { RepoFile } from "./unpack-repo.ts";

export type FileKind = "page" | "route" | "server_action" | "component" | "lib" | "migration" | "config" | "test" | "other";
export type SymbolKind = "function" | "component" | "class" | "variable" | "type";
export type CodeSymbol = { name: string; kind: SymbolKind; exported: boolean; line: number };

export type CodeFileInfo = {
  path: string;
  language: string;
  kind: FileKind;
  sizeBytes: number;
  sha256: string;
  symbols: CodeSymbol[];
  imports: string[];
  envVars: string[];
  isClient: boolean;
  redactions: number;
};

export type StackInfo = {
  next?: string;
  react?: string;
  supabase: boolean;
  stripe: boolean;
  openai: boolean;
  anthropic: boolean;
  vercelAi: boolean;
};

// One top-level statement of a parsed file, with its 1-based line range. The chunker cuts on these.
export type Unit = {
  type: "import" | "directive" | "declaration" | "statement";
  startLine: number;
  endLine: number;
  symbols: CodeSymbol[];
};

type Statement = ParseResult["program"]["body"][number];

const CODE_LANGUAGES = new Set(["ts", "tsx", "js", "jsx"]);

export const isCodeLanguage = (language: string) => CODE_LANGUAGES.has(language);

export function languageOf(path: string): string {
  const name = (path.split("/").at(-1) ?? "").toLowerCase();
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot + 1);
  switch (extension) {
    case "ts":
    case "mts":
    case "cts":
      return "ts";
    case "tsx":
      return "tsx";
    case "js":
    case "mjs":
    case "cjs":
      return "js";
    case "jsx":
      return "jsx";
    case "sql":
      return "sql";
    case "json":
    case "jsonc":
      return "json";
    case "md":
    case "mdx":
      return "md";
    default:
      return "other";
  }
}

// What the person sees in the dashboard and what the chunker is given: the file text with secrets masked.
export function redactedText(file: RepoFile): { text: string; count: number } {
  const { text, count } = redactSecrets(file.text, { envFile: isEnvFilePath(file.path) });
  return { text, count };
}

// ───────────── Lines ─────────────

// Offsets where each line starts. oxc offsets are JS string offsets (UTF-16), the same unit as String.prototype.indexOf,
// so an emoji before a function does not shift its line number.
function lineStartsOf(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function lineAt(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if ((starts[middle] as number) <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

// ───────────── Parsing ─────────────

// Does this part of the syntax tree contain JSX? A loop with its own stack, so a very deep tree cannot overflow the call stack.
function containsJsx(root: unknown): boolean {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object") continue;
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    const type = (node as { type?: unknown }).type;
    if (type === "JSXElement" || type === "JSXFragment") return true;
    stack.push(...Object.values(node));
  }
  return false;
}

const isCapitalized = (name: string) => /^[A-Z]/.test(name);

function functionKind(name: string, body: unknown, anonymousDefault = false): SymbolKind {
  return (isCapitalized(name) || anonymousDefault) && containsJsx(body) ? "component" : "function";
}

type Parsed = { units: Unit[]; imports: string[] };

// Top-level statements, symbols and imports of a JS/TS file. null = the file has syntax errors (or the parser failed).
export function parseTopLevel(path: string, text: string): Parsed | null {
  let result: ParseResult;
  try {
    // .js files in React projects often hold JSX, so read them as "jsx".
    result = parseSync(path, text, languageOf(path) === "js" ? { lang: "jsx" } : {});
  } catch {
    return null;
  }
  if (result.errors.length > 0) return null;

  const starts = lineStartsOf(text);
  const lineOfNode = (node: { start: number; end: number }) => ({
    startLine: lineAt(starts, node.start),
    endLine: lineAt(starts, Math.max(node.start, node.end - 1)),
  });

  const units: Unit[] = [];
  const exportedLater = new Set<string>(); // from "export { a, b }"

  const declaration = (node: Statement, exported: boolean, isDefault: boolean): CodeSymbol[] | null => {
    const lines = lineOfNode(node);
    const at = lines.startLine;
    switch (node.type) {
      case "FunctionDeclaration": {
        const name = node.id?.name ?? "default";
        return [{ name, kind: functionKind(name, node.body, isDefault && !node.id), exported, line: at }];
      }
      case "ClassDeclaration":
        return [{ name: node.id?.name ?? "default", kind: "class", exported, line: at }];
      case "TSInterfaceDeclaration":
      case "TSTypeAliasDeclaration":
      case "TSEnumDeclaration":
        return [{ name: node.id.name, kind: "type", exported, line: at }];
      case "VariableDeclaration": {
        const symbols: CodeSymbol[] = [];
        for (const declarator of node.declarations) {
          if (declarator.id.type !== "Identifier") continue; // const { a, b } = x has no single name
          const name = declarator.id.name;
          const init = declarator.init;
          const isFunction = init?.type === "ArrowFunctionExpression" || init?.type === "FunctionExpression";
          symbols.push({
            name,
            kind: isFunction ? functionKind(name, init.body) : "variable",
            exported,
            line: lineAt(starts, declarator.start),
          });
        }
        return symbols.length > 0 ? symbols : null;
      }
      default:
        return null;
    }
  };

  for (const node of result.program.body) {
    const lines = lineOfNode(node);

    if (node.type === "ImportDeclaration") {
      units.push({ type: "import", ...lines, symbols: [] });
    } else if (node.type === "ExpressionStatement" && typeof (node as { directive?: unknown }).directive === "string") {
      units.push({ type: "directive", ...lines, symbols: [] });
    } else if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) {
        const symbols = declaration(node.declaration as Statement, true, false);
        units.push({ type: symbols ? "declaration" : "statement", ...lines, symbols: symbols ?? [] });
      } else {
        // export { a, b as c }  (a re-export with "from" has no local names)
        if (!node.source) {
          for (const specifier of node.specifiers) {
            if (specifier.local.type === "Identifier") exportedLater.add(specifier.local.name);
          }
        }
        units.push({ type: "statement", ...lines, symbols: [] });
      }
    } else if (node.type === "ExportDefaultDeclaration") {
      const inner = node.declaration;
      let symbols = declaration(inner as unknown as Statement, true, true);
      if (!symbols) {
        // export default <expression>: an identifier, an arrow function, an object...
        if (inner.type === "Identifier") {
          exportedLater.add(inner.name); // export default foo: marks the existing symbol foo as exported
          symbols = [];
        } else {
          const isFunction = inner.type === "ArrowFunctionExpression" || inner.type === "FunctionExpression";
          symbols = [
            { name: "default", kind: isFunction ? functionKind("default", inner.body, true) : "variable", exported: true, line: lines.startLine },
          ];
        }
      }
      units.push({ type: symbols.length > 0 ? "declaration" : "statement", ...lines, symbols });
    } else {
      const symbols = declaration(node, false, false);
      units.push({ type: symbols ? "declaration" : "statement", ...lines, symbols: symbols ?? [] });
    }
  }

  for (const unit of units) {
    for (const symbol of unit.symbols) if (exportedLater.has(symbol.name)) symbol.exported = true;
  }

  // Imports: static ones, "export ... from", and dynamic import("x") with a plain string.
  const imports: string[] = [];
  for (const entry of result.module.staticImports) imports.push(entry.moduleRequest.value);
  for (const entry of result.module.staticExports) {
    for (const item of entry.entries) if (item.moduleRequest) imports.push(item.moduleRequest.value);
  }
  for (const entry of result.module.dynamicImports) {
    const literal = text.slice(entry.moduleRequest.start, entry.moduleRequest.end).trim();
    const match = /^(["'`])([^"'`$\\]*)\1$/.exec(literal);
    if (match) imports.push(match[2] as string);
  }

  return { units, imports: [...new Set(imports)] };
}

// ───────────── Kind, env vars ─────────────

const TEST_FILE = /\.(?:test|spec)\.[^/]+$/;
const E2E_FOLDER = /(?:^|\/)e2e\//;
const CONFIG_FILE = /\.config\.[^/]+$/;
const MIGRATION_FILE = /(?:^|\/)supabase\/migrations\/[^/]+\.sql$/;
const PAGE_FILE = /(?:^|\/)app\/(?:.*\/)?page\.[^/]+$/;
const ROUTE_FILE = /(?:^|\/)app\/(?:.*\/)?route\.[^/]+$/;
const PAGES_API = /(?:^|\/)pages\/api\//;
const COMPONENTS_FOLDER = /(?:^|\/)components\//;
// The directives at the top of a file ("use client", "use server", "use strict"...), after comments and blank lines.
// A plain loop, not one big regex: a regex with nested lazy comment matching can take exponential time on a file that
// starts with many block comments.
function leadingDirectives(text: string): string[] {
  const found: string[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i] as string;
    if (/\s/.test(char)) {
      i++;
    } else if (text.startsWith("//", i)) {
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end + 1;
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 2;
    } else if (char === '"' || char === "'") {
      const end = text.indexOf(char, i + 1);
      if (end === -1 || text.slice(i + 1, end).includes("\n")) break;
      found.push(text.slice(i + 1, end));
      i = end + 1;
      // A directive is a whole statement: an optional ";", then the next line. Anything else means it was part of code.
      while (text[i] === " " || text[i] === "\t") i++;
      if (text[i] === ";") i++;
      while (text[i] === " " || text[i] === "\t") i++;
      if (i < text.length && text[i] !== "\n" && text[i] !== "\r" && !text.startsWith("//", i) && !text.startsWith("/*", i)) {
        found.pop();
        break;
      }
    } else {
      break;
    }
  }
  return found;
}

function kindOf(path: string, language: string, directive: string | null): FileKind {
  const name = path.split("/").at(-1) ?? "";
  if (TEST_FILE.test(path) || E2E_FOLDER.test(path)) return "test";
  if (isEnvFilePath(path) || CONFIG_FILE.test(name) || name === "package.json" || name === "vercel.json") return "config";
  if (MIGRATION_FILE.test(path)) return "migration";
  if (!isCodeLanguage(language)) return "other";
  if (PAGE_FILE.test(path)) return "page";
  if (ROUTE_FILE.test(path) || PAGES_API.test(path)) return "route";
  if (directive === "use server") return "server_action";
  if (COMPONENTS_FOLDER.test(path)) return "component";
  return "lib";
}

const NAME = "[A-Za-z_][A-Za-z0-9_]*";
const ENV_ACCESS = [
  new RegExp(`process\\.env\\.(${NAME})`, "g"),
  new RegExp(`process\\.env\\[\\s*["'\`](${NAME})["'\`]\\s*\\]`, "g"),
  new RegExp(`import\\.meta\\.env\\.(${NAME})`, "g"),
  new RegExp(`Deno\\.env\\.get\\(\\s*["'\`](${NAME})["'\`]\\s*\\)`, "g"),
];
// [ \t] and not \s: with the "m" flag, \s would run across blank lines.
const ENV_KEY_LINE = new RegExp(`^[ \\t]*(?:export[ \\t]+)?(${NAME})[ \\t]*=`, "gm");

// Names only. For .env files: the left side of KEY=value.
function envVarNames(text: string, envFile: boolean): string[] {
  const names = new Set<string>();
  for (const pattern of ENV_ACCESS) for (const match of text.matchAll(pattern)) names.add(match[1] as string);
  if (envFile) for (const match of text.matchAll(ENV_KEY_LINE)) names.add(match[1] as string);
  return [...names].sort();
}

// ───────────── The map ─────────────

export function mapFile(file: RepoFile): CodeFileInfo {
  const envFile = isEnvFilePath(file.path);
  const { text, count } = redactedText(file);
  const language = languageOf(file.path);
  const directives = isCodeLanguage(language) ? leadingDirectives(text) : [];
  const directive = directives.find((name) => name === "use client" || name === "use server") ?? null;
  const parsed = isCodeLanguage(language) ? parseTopLevel(file.path, text) : null;

  return {
    path: file.path,
    language,
    kind: kindOf(file.path, language, directive),
    sizeBytes: file.sizeBytes,
    // Of the masked text, so the hash never depends on a secret.
    sha256: createHash("sha256").update(text).digest("hex"),
    symbols: parsed?.units.flatMap((unit) => unit.symbols) ?? [],
    imports: parsed?.imports ?? [],
    envVars: envVarNames(text, envFile),
    isClient: directive === "use client",
    redactions: count,
  };
}

// ───────────── The stack ─────────────

// "^16.4.3" -> "16.4.3". Not a version at all ("catalog:", "workspace:*", "npm:x", "file:..") -> undefined.
const cleanVersion = (version: string): string | undefined => (/^[a-z]+:/i.test(version) ? undefined : version.replace(/^[\s^~>=<v]+/, ""));

// What the app is built with, read from its package.json files (the one nearest the root wins for versions).
export function detectStack(files: RepoFile[]): StackInfo {
  const stack: StackInfo = { supabase: false, stripe: false, openai: false, anthropic: false, vercelAi: false };
  const manifests = files
    .filter((file) => file.path === "package.json" || file.path.endsWith("/package.json"))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length);

  for (const file of manifests) {
    let json: unknown;
    try {
      json = JSON.parse(file.text);
    } catch {
      continue;
    }
    if (json === null || typeof json !== "object") continue;
    const record = json as Record<string, unknown>;
    const deps: Record<string, unknown> = {};
    for (const section of ["dependencies", "devDependencies"]) {
      const value = record[section];
      if (value !== null && typeof value === "object") Object.assign(deps, value);
    }

    const next = deps.next;
    const react = deps.react;
    if (stack.next === undefined && typeof next === "string") stack.next = cleanVersion(next);
    if (stack.react === undefined && typeof react === "string") stack.react = cleanVersion(react);
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@supabase/")) stack.supabase = true;
      if (name === "stripe" || name.startsWith("@stripe/")) stack.stripe = true;
      if (name === "openai") stack.openai = true;
      if (name === "@anthropic-ai/sdk") stack.anthropic = true;
      if (name === "ai" || name.startsWith("@ai-sdk/")) stack.vercelAi = true;
    }
  }
  return stack;
}
