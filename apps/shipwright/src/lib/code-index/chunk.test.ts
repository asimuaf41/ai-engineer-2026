import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { EMBEDDING } from "../ai/embedding-config.ts";
import { mapFile } from "./code-map.ts";
import { chunkFile } from "./chunk.ts";
import type { RepoFile } from "./unpack-repo.ts";

const file = (path: string, text: string): RepoFile => ({ path, text, sizeBytes: Buffer.byteLength(text) });
const chunks = (path: string, text: string) => {
  const f = file(path, text);
  return chunkFile(f, mapFile(f));
};
const range = (c: { startLine: number; endLine: number }) => `${c.startLine}-${c.endLine}`;
const numbered = (count: number, prefix = "  const v") => Array.from({ length: count }, (_, i) => `${prefix}${i} = ${i};`);

// Built at run time so this file never contains something that looks like a real key.
const supabaseKey = "sb_secret_" + "Qw3rTy".repeat(5);

test("a page component is one chunk with its symbol, lines and the exact header line", () => {
  const text = [
    'import Link from "next/link";',
    "",
    "export default function Home() {",
    ...numbered(8),
    "  return <Link href=\"/\">x</Link>;",
    "}",
  ].join("\n");
  const result = chunks("src/app/page.tsx", text);
  assert.equal(result.length, 1);
  const [chunk] = result;
  assert.equal(chunk?.symbol, "Home");
  assert.equal(range(chunk as never), "3-13");
  assert.equal(chunk?.embedText, `// src/app/page.tsx · Home · lines 3-13\n${chunk?.content}`);
  assert.ok(chunk?.content.startsWith("export default function Home()"));
});

test("contentHash is sha256 of model:dims:embedText", () => {
  const [chunk] = chunks("src/a.ts", "export const a = 1;\n");
  const expected = createHash("sha256").update(`${EMBEDDING.model}:${EMBEDDING.dims}:${chunk?.embedText}`).digest("hex");
  assert.equal(chunk?.contentHash, expected);
});

test("imports are not chunked when the file has code; an imports-only file gives one 'imports' chunk", () => {
  const withCode = chunks("src/a.ts", 'import a from "a";\nimport b from "b";\nexport const x = 1;\n');
  assert.deepEqual(withCode.map((c) => c.symbol), ["x"]);
  assert.ok(!withCode[0]?.content.includes("import"));

  const importsOnly = chunks("src/index.ts", 'import a from "a";\nimport b from "b";\n');
  assert.equal(importsOnly.length, 1);
  assert.equal(importsOnly[0]?.symbol, "imports");
  assert.equal(range(importsOnly[0] as never), "1-2");
});

test("small neighbours are merged; big ones stay apart", () => {
  const small = chunks("src/a.ts", "export const a = 1;\nexport const b = 2;\nexport const c = 3;\n");
  assert.equal(small.length, 1);
  assert.equal(small[0]?.symbol, "a, b, c");
  assert.equal(range(small[0] as never), "1-3");

  const big = chunks(
    "src/b.ts",
    ["export function one() {", ...numbered(10), "}", "", "export function two() {", ...numbered(10), "}"].join("\n"),
  );
  assert.deepEqual(big.map((c) => c.symbol), ["one", "two"]);
});

test("a 300-line function is cut into 80-line windows that overlap by 10 and keep the symbol", () => {
  const text = ["export function huge() {", ...numbered(298), "}"].join("\n");
  const result = chunks("src/huge.ts", text);
  assert.deepEqual(result.map(range), ["1-80", "71-150", "141-220", "211-290", "281-300"]);
  assert.ok(result.every((c) => c.symbol === "huge"));
  // The overlap is real text shared by neighbours.
  assert.equal(result[0]?.content.split("\n").slice(-10).join("\n"), result[1]?.content.split("\n").slice(0, 10).join("\n"));
});

test("under 120 lines but over 6,000 characters is still split", () => {
  const longLine = `  const text = "${"x".repeat(300)}";`;
  const text = ["export function wide() {", ...Array.from({ length: 40 }, () => longLine), "}"].join("\n");
  const result = chunks("src/wide.ts", text);
  assert.ok(result.length >= 2);
  assert.ok(result.every((c) => c.content.length <= 6000));
  assert.ok(result.every((c) => c.symbol === "wide"));
});

test("a file with a syntax error is cut into 60-line windows, and nothing throws", () => {
  const text = [...numbered(130, "const broken"), "export function ( {"].join("\n");
  const result = chunks("src/broken.ts", text);
  assert.deepEqual(result.map(range), ["1-60", "51-110", "101-131"]);
  assert.ok(result.every((c) => c.symbol === null));
  assert.ok(result[0]?.embedText.startsWith("// src/broken.ts · lines · lines 1-60\n"));
});

test("an emoji before a function does not shift the chunk's start line", () => {
  const result = chunks("src/e.ts", "// 😀😀 party\nconst before = '🎉';\n\nexport function after() {\n" + numbered(9).join("\n") + "\n}\n");
  const after = result.find((c) => c.symbol === "after");
  assert.equal(after?.startLine, 4);
});

test("a migration is split per statement", () => {
  const sql = [
    "-- Day 15: the code index",
    "create table public.code_indexes (",
    "  id uuid primary key,",
    "  created_at timestamptz",
    ");",
    "",
    "create index code_indexes_org_idx on public.code_indexes (id);",
    "",
    "alter table public.code_indexes enable row level security;",
    "",
    "grant select on public.code_indexes to authenticated;",
  ].join("\n");
  const result = chunks("supabase/migrations/1_x.sql", sql);
  // Four small statements: neighbours under 8 lines merge until a chunk reaches 8 lines (lines 1-9), the grant stays alone.
  assert.deepEqual(result.map(range), ["1-9", "11-11"]);
  assert.ok(result[0]?.symbol?.startsWith("create table public.code_indexes, create index"));
  assert.ok((result[0]?.symbol?.length ?? 0) <= 80); // a merged label is capped
  assert.equal(result[1]?.symbol, "grant select on public.code_indexes to authenticated");

  const big = chunks(
    "supabase/migrations/2_y.sql",
    [
      "create table public.a (",
      ...Array.from({ length: 10 }, (_, i) => `  c${i} int,`),
      "  z int",
      ");",
      "",
      "create table public.b (",
      ...Array.from({ length: 10 }, (_, i) => `  c${i} int,`),
      "  z int",
      ");",
      "",
      "grant select on public.b to authenticated;",
    ].join("\n"),
  );
  assert.deepEqual(big.map((c) => c.symbol), ["create table public.a", "create table public.b", "grant select on public.b to authenticated"]);
});

test("a 'create' line inside a $$ function body does not start a new chunk", () => {
  const sql = [
    "create function public.make() returns void language plpgsql as $$",
    "begin",
    ...Array.from({ length: 8 }, () => "  null;"),
    "create table inside_the_body (id int);",
    "end;",
    "$$;",
    "",
    "create table public.after_it (",
    ...Array.from({ length: 8 }, (_, i) => `  c${i} int,`),
    "  z int",
    ");",
  ].join("\n");
  const result = chunks("supabase/migrations/3_z.sql", sql);
  assert.equal(result.length, 2);
  assert.ok(result[0]?.content.includes("inside_the_body"));
  assert.equal(result[1]?.symbol, "create table public.after_it");
});

test("markdown, json, yaml and .env files are cut into 60-line windows with 10 lines of overlap", () => {
  const body = Array.from({ length: 130 }, (_, i) => `line ${i + 1}`).join("\n");
  for (const path of ["README.md", "data.json", "ci.yml", ".env.example"]) {
    const result = chunks(path, body);
    assert.deepEqual(result.map(range), ["1-60", "51-110", "101-130"], path);
    assert.ok(result.every((c) => c.symbol === null));
  }
});

test("a .env file never puts its secret in a chunk", () => {
  const result = chunks(".env.local", `SUPABASE_SECRET_KEY=${supabaseKey}\nOTHER=plain-value\n`);
  assert.equal(result.length, 1);
  assert.ok(!result[0]?.content.includes(supabaseKey));
  assert.ok(!result[0]?.embedText.includes("plain-value"));
  assert.ok(result[0]?.content.includes("SUPABASE_SECRET_KEY=[REDACTED:supabase-secret-key]"));
});

test("a secret inside a code file is masked in every chunk's content and embedText", () => {
  const result = chunks("src/a.ts", `export const key = "${supabaseKey}";\nexport const other = 1;\n`);
  assert.ok(result.length > 0);
  for (const chunk of result) {
    assert.ok(!chunk.content.includes(supabaseKey));
    assert.ok(!chunk.embedText.includes(supabaseKey));
  }
  assert.ok(result.some((c) => c.content.includes("[REDACTED:supabase-secret-key]")));
});

test("the same input gives the same hash; a different path or different code gives a different one", () => {
  const code = "export const a = 1;\n";
  const first = chunks("src/a.ts", code)[0];
  assert.equal(chunks("src/a.ts", code)[0]?.contentHash, first?.contentHash);
  assert.notEqual(chunks("src/b.ts", code)[0]?.contentHash, first?.contentHash);
  assert.notEqual(chunks("src/a.ts", "export const a = 2;\n")[0]?.contentHash, first?.contentHash);
});

test("a comment right above a function stays with it", () => {
  const text = [
    "export const first = 1;",
    "",
    "/**",
    " * Adds two numbers.",
    " */",
    "export function add(a: number, b: number) {",
    ...numbered(8),
    "}",
  ].join("\n");
  const add = chunks("src/m.ts", text).find((c) => c.symbol === "add");
  assert.equal(add?.startLine, 3);
  assert.ok(add?.content.startsWith("/**"));
});

test("a code file with only comments or only a directive is still searchable (plain windows)", () => {
  const comments = chunks("src/notes.ts", "// TODO: rewrite the billing flow\n// owner: asim\n");
  assert.equal(comments.length, 1);
  assert.ok(comments[0]?.content.includes("billing flow"));
  assert.equal(chunks("src/c.tsx", '"use client";\n')[0]?.content, '"use client";');
});

test("SQL: a comment above a statement goes with that statement, and $$ inside a comment is ignored", () => {
  const sql = [
    "create table public.a (",
    ...Array.from({ length: 8 }, (_, i) => `  c${i} int,`),
    "  z int",
    ");",
    "",
    "-- Note: this is not a $$ function body",
    "create table public.b (",
    ...Array.from({ length: 8 }, (_, i) => `  c${i} int,`),
    "  z int",
    ");",
  ].join("\n");
  const result = chunks("supabase/migrations/4_w.sql", sql);
  assert.deepEqual(result.map((c) => c.symbol), ["create table public.a", "create table public.b"]);
  assert.ok(!result[0]?.content.includes("Note:"));
  assert.ok(result[1]?.content.startsWith("-- Note:"));
});

test("an empty or blank file gives no chunks", () => {
  assert.deepEqual(chunks("src/empty.ts", ""), []);
  assert.deepEqual(chunks("notes.md", "\n\n   \n"), []);
});

test("one enormous line is cut so no chunk is over 12,000 characters (the database limit)", () => {
  const result = chunks("data.json", `{"blob":"${"é".repeat(30_000)}"}`);
  assert.ok(result.length >= 3);
  assert.ok(result.every((c) => c.content.length <= 12_000));
  assert.equal(result.map((c) => c.content).join(""), `{"blob":"${"é".repeat(30_000)}"}`);
});

test("Windows line endings are handled like Unix ones", () => {
  const unix = chunks("src/a.ts", "export const a = 1;\nexport const b = 2;\n");
  const windows = chunks("src/a.ts", "export const a = 1;\r\nexport const b = 2;\r\n");
  assert.deepEqual(windows.map((c) => c.content), unix.map((c) => c.content));
});
