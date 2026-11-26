// Cuts one file into chunks that are ready to embed. Pure: no I/O. Works on the secret-masked text only.
//
// Rules (by file type):
// - JS/TS: one chunk per top-level declaration (with the comment right above it). Imports are not chunked, unless the file
//   has nothing else. A file that does not parse falls back to plain line windows.
// - SQL: one chunk per statement (a line starting with create/alter/drop/grant/revoke), never splitting inside $$ ... $$.
// - Everything else (md, json, yaml, .env...): 60-line windows with 10 lines of overlap.
// Then, for all of them: neighbours under 8 lines are merged, and anything over 120 lines or 6,000 characters is cut into
// windows (80 lines, 10 overlap, same symbol).
import { createHash } from "node:crypto";
import { EMBEDDING } from "../ai/embedding-config.ts";
import { parseTopLevel, redactedText, type CodeFileInfo } from "./code-map.ts";
import type { RepoFile } from "./unpack-repo.ts";

export type Chunk = {
  path: string;
  symbol: string | null;
  startLine: number;
  endLine: number;
  content: string;
  embedText: string; // what we send to the embedding model: a one-line header + the content
  contentHash: string; // sha256(model:dims:embedText). Same hash = same vector, so unchanged code is never paid for twice
};

const SMALL_UNIT_LINES = 8;
const MAX_CHUNK_LINES = 120;
const MAX_CHUNK_CHARS = 6000;
const WINDOW_LINES = 80;
const TEXT_WINDOW_LINES = 60;
const WINDOW_OVERLAP = 10;
const MAX_CONTENT_CHARS = 12000; // the code_chunks.content column refuses more
const MAX_SYMBOL_LABEL = 80;

type Segment = { symbol: string | null; startLine: number; endLine: number };

const SQL_STATEMENT_START = /^(?:create|alter|drop|grant|revoke)\b/i;
const DOLLAR_TAG = /\$[A-Za-z_]*\$/g;
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;

// ───────────── Windows ─────────────

// Cuts lines start..end into windows of at most `maxLines` lines and 6,000 characters, overlapping by 10 lines.
function windows(lines: string[], start: number, end: number, maxLines: number, symbol: string | null): Segment[] {
  const result: Segment[] = [];
  let first = start;
  while (first <= end) {
    let last = first;
    let chars = (lines[first - 1] ?? "").length;
    while (last < end && last - first + 1 < maxLines && chars + 1 + (lines[last] ?? "").length <= MAX_CHUNK_CHARS) {
      last++;
      chars += 1 + (lines[last - 1] ?? "").length;
    }
    result.push({ symbol, startLine: first, endLine: last });
    if (last >= end) break;
    // Overlap only when the window was long enough to have something to overlap with.
    first = last - WINDOW_OVERLAP + 1 > first ? last - WINDOW_OVERLAP + 1 : last + 1;
  }
  return result;
}

const charsOf = (lines: string[], segment: Segment) => lines.slice(segment.startLine - 1, segment.endLine).join("\n").length;
const lineCount = (segment: Segment) => segment.endLine - segment.startLine + 1;

function joinSymbols(a: string | null, b: string | null): string | null {
  const joined = [a, b].filter((part): part is string => part !== null && part !== "").join(", ");
  if (joined === "") return null;
  return joined.length > MAX_SYMBOL_LABEL ? `${joined.slice(0, MAX_SYMBOL_LABEL - 3)}...` : joined;
}

// Two neighbours that are both under 8 lines become one chunk. (A merged chunk grows until it reaches 8 lines.)
function mergeSmall(segments: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (const segment of segments) {
    const previous = result.at(-1);
    if (previous && lineCount(previous) < SMALL_UNIT_LINES && lineCount(segment) < SMALL_UNIT_LINES) {
      result[result.length - 1] = {
        symbol: joinSymbols(previous.symbol, segment.symbol),
        startLine: previous.startLine,
        endLine: segment.endLine,
      };
    } else {
      result.push(segment);
    }
  }
  return result;
}

function splitBig(lines: string[], segments: Segment[]): Segment[] {
  return segments.flatMap((segment) =>
    lineCount(segment) > MAX_CHUNK_LINES || charsOf(lines, segment) > MAX_CHUNK_CHARS
      ? windows(lines, segment.startLine, segment.endLine, WINDOW_LINES, segment.symbol)
      : [segment],
  );
}

// ───────────── Segments per file type ─────────────

function codeSegments(path: string, text: string, lines: string[]): Segment[] | null {
  const parsed = parseTopLevel(path, text);
  if (!parsed) return null;

  const body = parsed.units.filter((unit) => unit.type === "declaration" || unit.type === "statement");
  if (body.length === 0) {
    const imports = parsed.units.filter((unit) => unit.type === "import");
    const first = imports[0];
    const last = imports.at(-1);
    // Only comments or a bare directive: no structure, but the text should still be searchable, so use plain windows.
    return first && last ? [{ symbol: "imports", startLine: first.startLine, endLine: last.endLine }] : null;
  }

  const segments: Segment[] = [];
  let previousEnd = 0; // the comment above a declaration belongs to it, but never reaches back into the previous unit
  for (const unit of parsed.units) {
    if (unit.type === "declaration" || unit.type === "statement") {
      let start = unit.startLine;
      while (start - 1 > previousEnd && COMMENT_LINE.test(lines[start - 2] ?? "")) start--;
      const names = unit.symbols.map((symbol) => symbol.name).join(", ");
      segments.push({ symbol: names === "" ? null : names, startLine: start, endLine: unit.endLine });
    }
    previousEnd = unit.endLine;
  }
  return segments;
}

function sqlSegments(lines: string[]): Segment[] | null {
  const starts: number[] = [];
  let openTag: string | null = null; // inside a $$ ... $$ (or $tag$ ... $tag$) body, "create" is just text
  lines.forEach((line, index) => {
    if (openTag === null && SQL_STATEMENT_START.test(line)) starts.push(index + 1);
    // A "$$" inside a "-- comment" is not a function body.
    for (const tag of line.replace(/--.*$/, "").match(DOLLAR_TAG) ?? []) {
      openTag = openTag === null ? tag : tag === openTag ? null : openTag;
    }
  });
  if (starts.length === 0) return null;

  // Like in code files, a "-- comment" block right above a statement belongs to that statement, not to the one before it.
  const begins = starts.map((start, index) => {
    if (index === 0) return 1;
    let first = start;
    while (first - 1 > (starts[index - 1] as number) && (lines[first - 2] ?? "").trim().startsWith("--")) first--;
    return first;
  });

  return starts.map((start, index) => {
    let end = (begins[index + 1] ?? lines.length + 1) - 1;
    while (end > start && (lines[end - 1] ?? "").trim() === "") end--;
    const label = (lines[start - 1] ?? "").trim().replace(/\s+/g, " ").replace(/[\s(;]+$/, "").slice(0, 60);
    return { symbol: label, startLine: begins[index] as number, endLine: end };
  });
}

// ───────────── Output ─────────────

// The database refuses more than 12,000 characters. Only a single enormous line (minified code, a data blob) gets here.
function capContent(content: string): string[] {
  if (content.length <= MAX_CONTENT_CHARS) return [content];
  const pieces: string[] = [];
  for (let offset = 0; offset < content.length; ) {
    let cut = Math.min(offset + MAX_CONTENT_CHARS, content.length);
    const code = content.charCodeAt(cut - 1);
    if (cut < content.length && code >= 0xd800 && code <= 0xdbff) cut--; // do not split an emoji in half
    pieces.push(content.slice(offset, cut));
    offset = cut;
  }
  return pieces;
}

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function chunkFile(file: RepoFile, info: CodeFileInfo): Chunk[] {
  const { text } = redactedText(file);
  const lines = text.split("\n").map((line) => line.replace(/\r$/, ""));
  if (lines.at(-1) === "") lines.pop();
  if (lines.length === 0) return [];

  let segments: Segment[] | null = null;
  if (info.language === "ts" || info.language === "tsx" || info.language === "js" || info.language === "jsx") {
    segments = codeSegments(file.path, text, lines);
  } else if (info.language === "sql") {
    segments = sqlSegments(lines);
  }
  // No structure found (or the file does not parse): plain line windows.
  const finalSegments = segments === null
    ? windows(lines, 1, lines.length, TEXT_WINDOW_LINES, null)
    : splitBig(lines, mergeSmall(segments));

  const chunks: Chunk[] = [];
  for (const segment of finalSegments) {
    const content = lines.slice(segment.startLine - 1, segment.endLine).join("\n");
    if (content.trim() === "") continue;
    for (const piece of capContent(content)) {
      const embedText = `// ${file.path} · ${segment.symbol ?? "lines"} · lines ${segment.startLine}-${segment.endLine}\n${piece}`;
      chunks.push({
        path: file.path,
        symbol: segment.symbol,
        startLine: segment.startLine,
        endLine: segment.endLine,
        content: piece,
        embedText,
        contentHash: sha256(`${EMBEDDING.model}:${EMBEDDING.dims}:${embedText}`),
      });
    }
  }
  return chunks;
}
