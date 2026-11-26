// The small pure pieces of code search: what a valid question looks like, how a hit becomes a short snippet, and how a hit
// becomes a link to GitHub. No I/O, so they are unit-tested. (search.ts does the database and embedding work.)
import { z } from "zod";

export const QUERY_MIN = 2;
export const QUERY_MAX = 200;
export const SNIPPET_LINES = 6;
const SNIPPET_LINE_CHARS = 160;

// A search question: 2 to 200 characters after trimming. (Whitespace-only is therefore too short.)
export const QuerySchema = z
  .string()
  .trim()
  .min(QUERY_MIN, `Type at least ${QUERY_MIN} characters.`)
  .max(QUERY_MAX, `Keep it under ${QUERY_MAX} characters.`);

export type MatchedBy = "keyword" | "meaning" | "both";

export type CodeHit = {
  path: string;
  symbol: string | null;
  startLine: number;
  endLine: number;
  snippet: string;
  matchedBy: MatchedBy;
};

// What the search action answers. A plain object (no thrown errors), so the page can always show something calm.
export type SearchOutcome =
  | { status: "ok"; hits: CodeHit[]; ms: number; commitSha: string; keywordOnly: boolean }
  | { status: "no_index" } // nothing ready to search yet
  | { status: "invalid"; message: string }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "error" };

export type SearchAction = (slug: string, appId: string, query: string) => Promise<SearchOutcome>;

// The first 6 lines of a chunk, each cut at 160 characters. Leading blank lines are dropped, so the snippet starts with code.
export function makeSnippet(content: string): string {
  const lines = content.split(/\r?\n/);
  while (lines.length > 0 && (lines[0] ?? "").trim() === "") lines.shift();
  return lines
    .slice(0, SNIPPET_LINES)
    .map((line) => (line.length > SNIPPET_LINE_CHARS ? `${line.slice(0, SNIPPET_LINE_CHARS - 1)}…` : line))
    .join("\n")
    .trimEnd();
}

const REPO_NAME = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;

// https://github.com/<repo>/blob/<sha>/<path>#L<a>-L<b>. The sha is the commit that was indexed, so the link shows exactly the
// lines we searched. null = something is not safe to put in a link (the caller then shows the path without a link).
export function githubBlobUrl(repoFullName: string, sha: string, path: string, startLine: number, endLine: number): string | null {
  if (!REPO_NAME.test(repoFullName) || !COMMIT_SHA.test(sha)) return null;
  if (path === "" || path.startsWith("/") || path.includes("\\") || path.includes("\0")) return null;
  const segments = path.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return null;
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 1 || endLine < startLine) return null;

  const encoded = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const lines = endLine > startLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`;
  return `https://github.com/${repoFullName}/blob/${sha}/${encoded}${lines}`;
}
