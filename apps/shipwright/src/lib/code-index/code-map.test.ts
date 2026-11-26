import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { detectStack, mapFile } from "./code-map.ts";
import type { RepoFile } from "./unpack-repo.ts";

const file = (path: string, text: string): RepoFile => ({ path, text, sizeBytes: Buffer.byteLength(text) });
const names = (path: string, text: string) => mapFile(file(path, text)).symbols.map((s) => `${s.name}:${s.kind}:${s.exported ? "exported" : "private"}`);

// Built at run time so this file never contains something that looks like a real key.
const supabaseKey = "sb_secret_" + "Qw3rTy".repeat(5);

test("a Next page component: kind page, default export is a component, imports are listed", () => {
  const info = mapFile(
    file(
      "src/app/dashboard/page.tsx",
      [
        'import Link from "next/link";',
        'import { getOrg } from "@/lib/orgs";',
        "",
        "export default async function DashboardPage() {",
        "  const org = await getOrg();",
        '  return <Link href="/">{org.name}</Link>;',
        "}",
      ].join("\n"),
    ),
  );
  assert.equal(info.kind, "page");
  assert.equal(info.language, "tsx");
  assert.deepEqual(info.symbols, [{ name: "DashboardPage", kind: "component", exported: true, line: 4 }]);
  assert.deepEqual(info.imports, ["next/link", "@/lib/orgs"]);
  assert.equal(info.isClient, false);
});

test("an API route with POST: kind route, exported functions with their lines", () => {
  const info = mapFile(
    file(
      "src/app/api/checkout/route.ts",
      [
        "export async function GET() {",
        "  return Response.json({});",
        "}",
        "",
        "export async function POST(req: Request) {",
        "  return Response.json(await req.json());",
        "}",
      ].join("\n"),
    ),
  );
  assert.equal(info.kind, "route");
  assert.deepEqual(info.symbols, [
    { name: "GET", kind: "function", exported: true, line: 1 },
    { name: "POST", kind: "function", exported: true, line: 5 },
  ]);
});

test("a pages/api file is a route too", () => {
  assert.equal(mapFile(file("pages/api/hello.ts", "export default function handler() {}")).kind, "route");
});

test("a 'use server' file is a server action file, even when a comment comes first", () => {
  const info = mapFile(file("src/lib/auth-actions.ts", '// Server actions\n"use server";\n\nexport async function signIn() {}\nexport async function signOut() {}\n'));
  assert.equal(info.kind, "server_action");
  assert.deepEqual(info.symbols.map((s) => s.name), ["signIn", "signOut"]);
  assert.equal(info.isClient, false);
});

test("a 'use client' file sets isClient; a file under components/ is a component", () => {
  const info = mapFile(file("src/components/Button.tsx", "'use client';\nexport function Button() { return <button />; }\n"));
  assert.equal(info.kind, "component");
  assert.equal(info.isClient, true);
  assert.deepEqual(info.symbols, [{ name: "Button", kind: "component", exported: true, line: 2 }]);
});

test("symbol kinds: arrow function, component, plain variable, class, type, interface, enum", () => {
  const text = [
    "const helper = () => 1;",
    "const Card = () => <div />;",
    "const lower = () => <div />;",
    "const LIMIT = 5;",
    "class Store {}",
    "type Id = string;",
    "interface User { id: Id }",
    "enum Color { Red }",
    "function Widget() { return <p />; }",
    "function compute() { return 1; }",
  ].join("\n");
  assert.deepEqual(names("src/x.tsx", text), [
    "helper:function:private",
    "Card:component:private",
    "lower:function:private", // not capitalized, so not a component
    "LIMIT:variable:private",
    "Store:class:private",
    "Id:type:private",
    "User:type:private",
    "Color:type:private",
    "Widget:component:private",
    "compute:function:private",
  ]);
});

test("export { a, b } marks them exported; an anonymous default export is called 'default'", () => {
  assert.deepEqual(names("a.ts", "const a = 1;\nconst b = 2;\nconst c = 3;\nexport { a, b as bee };"), [
    "a:variable:exported",
    "b:variable:exported",
    "c:variable:private",
  ]);
  assert.deepEqual(names("b.ts", "export default function () {}"), ["default:function:exported"]);
  assert.deepEqual(names("c.tsx", "export default () => <div />;"), ["default:component:exported"]);
  assert.deepEqual(names("d.ts", "const store = {};\nexport default store;"), ["store:variable:exported"]);
});

test("imports: static, type-only, export-from and dynamic, without repeats", () => {
  const info = mapFile(
    file(
      "src/x.ts",
      [
        'import a from "alpha";',
        'import type { T } from "beta";',
        'import { b } from "alpha";',
        'export * from "gamma";',
        'export { z } from "delta";',
        'const lazy = () => import("epsilon");',
        "const dynamic = (name: string) => import(name);",
      ].join("\n"),
    ),
  );
  assert.deepEqual(info.imports, ["alpha", "beta", "gamma", "delta", "epsilon"]);
});

test("a file with a syntax error does not throw: no symbols or imports, but hash and env vars still work", () => {
  const text = 'import a from "x";\nconst key = process.env.OOPS;\nexport function ( {';
  const info = mapFile(file("src/broken.ts", text));
  assert.deepEqual(info.symbols, []);
  assert.deepEqual(info.imports, []);
  assert.deepEqual(info.envVars, ["OOPS"]);
  assert.equal(info.sha256, createHash("sha256").update(text).digest("hex"));
});

test("many block comments at the top of a file are fast (no regex blow-up), and a directive hidden behind code does not count", () => {
  const comments = Array.from({ length: 60 }, (_, i) => `/* c${i} */`).join("\n");
  const started = Date.now();
  const info = mapFile(file("src/generated.ts", `${comments}\nexport const a = 1;\n`));
  assert.ok(Date.now() - started < 500, "took too long");
  assert.equal(info.isClient, false);
  assert.equal(info.symbols.length, 1);

  assert.equal(mapFile(file("src/a.ts", '/* a */ foo(); /* b */ "use client";\n')).isClient, false);
  assert.equal(mapFile(file("src/b.ts", '/* a */\n"use strict";\n"use client";\nexport const x = 1;\n')).isClient, true);
  assert.equal(mapFile(file("src/c.ts", '"use client" + 1;\n')).isClient, false);
});

test("an env file made of many blank lines is fast", () => {
  const started = Date.now();
  const info = mapFile(file(".env.example", `${"\n".repeat(200_000)}A=1\n`));
  assert.ok(Date.now() - started < 1000, "took too long");
  assert.deepEqual(info.envVars, ["A"]);
});

test("an emoji before a function does not shift its line number", () => {
  const info = mapFile(file("src/e.ts", "// 😀😀😀 party\nconst x = '🎉';\n\nexport function after() {}\n"));
  assert.deepEqual(info.symbols.find((s) => s.name === "after")?.line, 4);
});

test("env vars: all four ways of reading them, sorted, no repeats, names only", () => {
  const info = mapFile(
    file(
      "src/env.ts",
      [
        "const a = process.env.ZED;",
        'const b = process.env["ALPHA"];',
        "const c = import.meta.env.VITE_URL;",
        'const d = Deno.env.get("DENO_KEY");',
        "const e = process.env.ZED;",
        'const f = process.env[dynamicName];',
      ].join("\n"),
    ),
  );
  assert.deepEqual(info.envVars, ["ALPHA", "DENO_KEY", "VITE_URL", "ZED"]);
});

test("a .env file: kind config, variable names listed, the secret value masked and counted", () => {
  const info = mapFile(file(".env.local", `SUPABASE_SECRET_KEY=${supabaseKey}\nNEXT_PUBLIC_URL=\n# NOTE=1\n`));
  assert.equal(info.kind, "config");
  assert.deepEqual(info.envVars, ["NEXT_PUBLIC_URL", "SUPABASE_SECRET_KEY"]);
  assert.equal(info.redactions, 1);
});

test("the hash is taken from the masked text, never from the secret", () => {
  const original = `SUPABASE_SECRET_KEY=${supabaseKey}\n`;
  const info = mapFile(file(".env", original));
  const masked = "SUPABASE_SECRET_KEY=[REDACTED:supabase-secret-key]\n";
  assert.equal(info.sha256, createHash("sha256").update(masked).digest("hex"));
  assert.equal(info.sizeBytes, Buffer.byteLength(original));
});

test("a migration: kind migration, language sql", () => {
  const info = mapFile(file("supabase/migrations/20261123_code_index.sql", "create table public.x (id int);"));
  assert.equal(info.kind, "migration");
  assert.equal(info.language, "sql");
});

test("kinds: config, test and everything else", () => {
  const kind = (path: string) => mapFile(file(path, "")).kind;
  assert.equal(kind("next.config.ts"), "config");
  assert.equal(kind("apps/web/vercel.json"), "config");
  assert.equal(kind("package.json"), "config");
  assert.equal(kind("src/a.test.ts"), "test");
  assert.equal(kind("src/a.spec.tsx"), "test");
  assert.equal(kind("e2e/login.ts"), "test");
  assert.equal(kind("src/app/api/x.test.ts"), "test"); // a test beats "route"-like paths
  assert.equal(kind("src/lib/money.ts"), "lib");
  assert.equal(kind("README.md"), "other");
  assert.equal(kind("docs/schema.sql"), "other");
});

test("detectStack: a package.json with next and supabase-js", () => {
  const stack = detectStack([
    file("package.json", JSON.stringify({ dependencies: { next: "^16.4.3", react: "19.2.0", "@supabase/supabase-js": "2.119.0" } })),
    file("src/index.ts", ""),
  ]);
  assert.deepEqual(stack, { next: "16.4.3", react: "19.2.0", supabase: true, stripe: false, openai: false, anthropic: false, vercelAi: false });
});

test("detectStack: other SDKs, devDependencies, nested package.json files, and bad JSON is ignored", () => {
  const stack = detectStack([
    file("apps/web/package.json", JSON.stringify({ dependencies: { next: "~15.0.0", stripe: "^17.0.0" } })),
    file("package.json", JSON.stringify({ devDependencies: { next: "^16.0.0", "@anthropic-ai/sdk": "1.0.0", ai: "5.0.0", openai: "5.0.0" } })),
    file("packages/x/package.json", "{ not json"),
  ]);
  assert.equal(stack.next, "16.0.0"); // the one nearest the root wins
  assert.equal(stack.react, undefined);
  assert.deepEqual([stack.stripe, stack.openai, stack.anthropic, stack.vercelAi, stack.supabase], [true, true, true, true, false]);
});

test("detectStack: a version like 'catalog:' is not reported as a version", () => {
  const stack = detectStack([file("package.json", JSON.stringify({ dependencies: { next: "catalog:", react: "workspace:*" } }))]);
  assert.equal(stack.next, undefined);
  assert.equal(stack.react, undefined);
});

test("detectStack: no package.json means nothing is detected", () => {
  assert.deepEqual(detectStack([file("a.ts", "")]), { supabase: false, stripe: false, openai: false, anthropic: false, vercelAi: false });
});
