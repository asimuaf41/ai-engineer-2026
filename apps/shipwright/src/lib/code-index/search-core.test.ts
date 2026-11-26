import assert from "node:assert/strict";
import { test } from "node:test";
import { githubBlobUrl, makeSnippet, QUERY_MAX, QuerySchema } from "./search-core.ts";

const SHA = "a".repeat(40);

test("a question is 2 to 200 characters after trimming", () => {
  assert.equal(QuerySchema.safeParse("a").success, false);
  assert.equal(QuerySchema.safeParse("   ").success, false);
  assert.equal(QuerySchema.safeParse(" a ").success, false); // trimmed to 1
  assert.equal(QuerySchema.safeParse("ab").success, true);
  assert.equal(QuerySchema.safeParse("x".repeat(QUERY_MAX)).success, true);
  assert.equal(QuerySchema.safeParse("x".repeat(QUERY_MAX + 1)).success, false);
  assert.equal(QuerySchema.safeParse(123).success, false);
  assert.equal(QuerySchema.parse("  where is the key?  "), "where is the key?");
});

test("a snippet is the first 6 lines", () => {
  const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
  assert.equal(makeSnippet(content), "line 1\nline 2\nline 3\nline 4\nline 5\nline 6");
});

test("a snippet starts at the first real line, and keeps indentation", () => {
  assert.equal(makeSnippet("\n\n  const a = 1;\n    return a;\n"), "  const a = 1;\n    return a;");
});

test("a long line is cut with an ellipsis, so one minified line can't fill the page", () => {
  const snippet = makeSnippet("x".repeat(500));
  assert.equal(snippet.length, 160);
  assert.ok(snippet.endsWith("…"));
});

test("a snippet handles Windows line endings and empty content", () => {
  assert.equal(makeSnippet("a\r\nb\r\n"), "a\nb");
  assert.equal(makeSnippet(""), "");
  assert.equal(makeSnippet("\n \n"), "");
});

test("a GitHub link points at the indexed commit, with the line range", () => {
  assert.equal(
    githubBlobUrl("acme/shop", SHA, "src/lib/pay.ts", 12, 30),
    `https://github.com/acme/shop/blob/${SHA}/src/lib/pay.ts#L12-L30`,
  );
  assert.equal(githubBlobUrl("acme/shop", SHA, "a.ts", 5, 5), `https://github.com/acme/shop/blob/${SHA}/a.ts#L5`);
});

test("a GitHub link encodes each part of the path, so a name can't change the link", () => {
  const url = githubBlobUrl("acme/shop", SHA, "src/my folder/a#b?.ts", 1, 2);
  assert.equal(url, `https://github.com/acme/shop/blob/${SHA}/src/my%20folder/a%23b%3F.ts#L1-L2`);
  assert.equal(githubBlobUrl("acme/shop", SHA, "app/(auth)/[slug]/page.tsx", 1, 1), `https://github.com/acme/shop/blob/${SHA}/app/(auth)/%5Bslug%5D/page.tsx#L1`);
});

test("anything unsafe gives no link instead of a bad one", () => {
  assert.equal(githubBlobUrl("acme/shop", SHA, "../etc/passwd", 1, 1), null);
  assert.equal(githubBlobUrl("acme/shop", SHA, "a/../b.ts", 1, 1), null);
  assert.equal(githubBlobUrl("acme/shop", SHA, "/abs.ts", 1, 1), null);
  assert.equal(githubBlobUrl("acme/shop", SHA, "a\\b.ts", 1, 1), null);
  assert.equal(githubBlobUrl("acme/shop", SHA, "a//b.ts", 1, 1), null);
  assert.equal(githubBlobUrl("acme/shop", "main", "a.ts", 1, 1), null); // a branch is not a commit
  assert.equal(githubBlobUrl("not a repo", SHA, "a.ts", 1, 1), null);
  assert.equal(githubBlobUrl("evil.com/../x", SHA, "a.ts", 1, 1), null);
  assert.equal(githubBlobUrl("acme/shop", SHA, "a.ts", 0, 1), null);
  assert.equal(githubBlobUrl("acme/shop", SHA, "a.ts", 5, 2), null);
});
