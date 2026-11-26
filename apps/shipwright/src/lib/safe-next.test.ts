// Unit test for safeNext(): the guard that keeps "where to go after sign-in" on THIS site.
// Run: pnpm --filter shipwright test:unit   (Node's built-in test runner; Node 24 runs TypeScript directly)
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_NEXT, safeNext, workspaceSlugOf } from "./safe-next.ts";

test("keeps a normal path on this site", () => {
  assert.equal(safeNext("/o/acme"), "/o/acme");
  assert.equal(safeNext("/o/acme?tab=2"), "/o/acme?tab=2");
});

test("falls back to /onboarding for anything that could leave the site", () => {
  const unsafe: (string | null | undefined)[] = [
    "//evil.com", // "//host" means another site
    "https://evil.com", // a full address
    "", // nothing
    undefined, // missing
    null,
    "/\\evil.com", // browsers read a backslash like a slash, so this is "//evil.com"
    "/\t/evil.com", // a tab is stripped by the browser, leaving "//evil.com"
  ];
  for (const input of unsafe) {
    assert.equal(safeNext(input), DEFAULT_NEXT, `input ${JSON.stringify(input)} should fall back`);
  }
  assert.equal(DEFAULT_NEXT, "/onboarding");
});

test("workspaceSlugOf finds the workspace in a path, and nothing else", () => {
  assert.equal(workspaceSlugOf("/o/acme"), "acme");
  assert.equal(workspaceSlugOf("/o/acme/connect"), "acme");
  assert.equal(workspaceSlugOf("/o/asimworkspace-6dw1/connect?step=repo"), "asimworkspace-6dw1");
  assert.equal(workspaceSlugOf("/o/acme#top"), "acme");
  for (const other of ["/onboarding", "/o", "/o/", "/o/a", "/o/Acme", "/x/o/acme", "/o/-bad-/x", "/o/acme-evil.com@x"]) {
    assert.equal(workspaceSlugOf(other), null, other);
  }
});
