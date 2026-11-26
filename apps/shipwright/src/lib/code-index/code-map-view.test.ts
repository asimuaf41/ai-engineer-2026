import assert from "node:assert/strict";
import { test } from "node:test";
import { isFileKind, summarizeFiles, stackChips, type FileSummaryRow } from "./code-map-view.ts";

const row = (kind: string, env_vars: string[] = [], is_client = false, redactions = 0): FileSummaryRow => ({ kind, env_vars, is_client, redactions });

test("counts per kind come back in a fixed order, and kinds with no files are left out", () => {
  const summary = summarizeFiles([row("lib"), row("page"), row("lib"), row("migration"), row("page"), row("page")]);
  assert.equal(summary.total, 6);
  assert.deepEqual(summary.kinds.map((k) => `${k.label} ${k.count}`), ["Pages 3", "Libraries 2", "Migrations 1"]);
});

test("a kind we don't know is counted as Other, never dropped", () => {
  const summary = summarizeFiles([row("page"), row("something_new")]);
  assert.deepEqual(summary.kinds.map((k) => [k.kind, k.count]), [["page", 1], ["other", 1]]);
});

test("env vars: one entry per name, the number of files that read it, and whether a client file does", () => {
  const summary = summarizeFiles([
    row("lib", ["STRIPE_KEY", "DATABASE_URL"]),
    row("route", ["DATABASE_URL"]),
    row("component", ["NEXT_PUBLIC_URL", "STRIPE_KEY"], true),
    row("lib", ["DATABASE_URL", "DATABASE_URL"]), // a repeat inside one file counts once
  ]);
  assert.deepEqual(summary.envVars, [
    { name: "DATABASE_URL", files: 3, inClient: false },
    { name: "NEXT_PUBLIC_URL", files: 1, inClient: true },
    { name: "STRIPE_KEY", files: 2, inClient: true },
  ]);
});

test("redactions are added up over all files", () => {
  assert.equal(summarizeFiles([row("config", [], false, 2), row("lib", [], false, 0), row("lib", [], false, 3)]).redactions, 5);
});

test("an empty index gives an empty map", () => {
  assert.deepEqual(summarizeFiles([]), { total: 0, kinds: [], envVars: [], redactions: 0 });
});

test("isFileKind only accepts our kinds", () => {
  assert.equal(isFileKind("page"), true);
  assert.equal(isFileKind("server_action"), true);
  assert.equal(isFileKind("PAGE"), false);
  assert.equal(isFileKind(undefined), false);
  assert.equal(isFileKind("constructor"), false);
});

test("stack chips: versions and flags become short labels; junk is ignored", () => {
  assert.deepEqual(
    stackChips({ next: "16.4.3", react: "19.2.0", supabase: true, stripe: false, openai: false, anthropic: true, vercelAi: true }),
    ["Next.js 16.4.3", "React 19.2.0", "Supabase", "Anthropic", "Vercel AI SDK"],
  );
  assert.deepEqual(stackChips({ next: "<script>alert(1)</script>", supabase: "yes" }), ["Next.js"]);
  for (const junk of [null, undefined, "next", 5, [], [1]]) assert.deepEqual(stackChips(junk), []);
  assert.deepEqual(stackChips({}), []);
});
