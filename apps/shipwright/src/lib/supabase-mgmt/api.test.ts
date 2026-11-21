import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { listOrganizations, listProjects, mgmtGet } from "./api.ts";
import { MgmtApiError } from "./errors.ts";

type Seen = { url: string; authorization?: string };

function pretendSupabase(reply: { status?: number; body?: unknown; text?: string }) {
  const seen: Seen[] = [];
  const send = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), authorization: (init?.headers as Record<string, string> | undefined)?.authorization });
    return new Response(reply.text ?? JSON.stringify(reply.body ?? []), { status: reply.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { send, seen };
}

const project = (overrides: Record<string, unknown> = {}) => ({
  id: "deprecated-id",
  ref: "abcdefghijklmnopqrst",
  organization_id: "deprecated",
  organization_slug: "my-org-slug",
  name: "Shop",
  region: "eu-west-1",
  status: "ACTIVE_HEALTHY",
  created_at: "2026-01-01T00:00:00Z",
  database: { host: "db.example.supabase.co", version: "17" },
  ...overrides,
});

test("organizations come back as slug and name, using the bearer token", async () => {
  const { send, seen } = pretendSupabase({ body: [{ id: "old", slug: "org-one", name: "Org One" }, { id: "old2", slug: "org-two", name: "Org Two" }] });
  assert.deepEqual(await listOrganizations("tok", send), [{ slug: "org-one", name: "Org One" }, { slug: "org-two", name: "Org Two" }]);
  assert.deepEqual(seen, [{ url: "https://api.supabase.com/v1/organizations", authorization: "Bearer tok" }]);
});

test("projects use `ref` (not the deprecated id), keep only what we need, and carry their organization", async () => {
  const { send, seen } = pretendSupabase({ body: [project(), project({ ref: "zyxwvutsrqponmlkjihg", name: "Blog", status: "PAUSING" })] });
  const projects = await listProjects("tok", send);
  assert.equal(seen[0]?.url, "https://api.supabase.com/v1/projects");
  assert.deepEqual(projects[0], { ref: "abcdefghijklmnopqrst", name: "Shop", region: "eu-west-1", status: "ACTIVE_HEALTHY", organizationSlug: "my-org-slug" });
  assert.equal(projects[1]?.status, "PAUSING");
  assert.equal("database" in (projects[0] ?? {}), false);
});

test("an empty account gives empty lists", async () => {
  assert.deepEqual(await listOrganizations("tok", pretendSupabase({ body: [] }).send), []);
  assert.deepEqual(await listProjects("tok", pretendSupabase({ body: [] }).send), []);
});

test("a project whose ref is not a 20-letter ref is refused, not passed along", async () => {
  for (const ref of ["short", "ABCDEFGHIJKLMNOPQRST", "abcdefghijklmnopqrs1", "abcdefghijklmnopqrstu", "../../etc"]) {
    await assert.rejects(listProjects("tok", pretendSupabase({ body: [project({ ref })] }).send), MgmtApiError, ref);
  }
});

test("each HTTP failure keeps only its status", async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(listOrganizations("tok", pretendSupabase({ status, body: { message: "secret-looking text" } }).send), (error: unknown) => error instanceof MgmtApiError && error.status === status && !error.message.includes("secret-looking"));
  }
});

test("no connection, or a timeout, is a 504 error that keeps nothing from the thrown error", async () => {
  const send = (async () => {
    throw new TypeError("fetch failed: Bearer tok-DO-NOT-LEAK");
  }) as typeof fetch;
  await assert.rejects(listProjects("tok-DO-NOT-LEAK", send), (error: unknown) => error instanceof MgmtApiError && error.status === 504 && !String(error).includes("DO-NOT-LEAK"));
});

test("a reply that is not JSON, or has the wrong shape, is an error", async () => {
  await assert.rejects(listOrganizations("tok", pretendSupabase({ text: "<html>oops</html>" }).send), MgmtApiError);
  await assert.rejects(listOrganizations("tok", pretendSupabase({ body: { not: "a list" } }).send), MgmtApiError);
});

test("only /v1/... paths are allowed, so a token can never be sent somewhere else", async () => {
  const { send, seen } = pretendSupabase({ body: [] });
  for (const path of ["https://evil.example/v1/x", "//evil.example/v1/x", "/v2/projects", "/v1/../x", "/v1/projects?x=1", "v1/projects", "/v1/Projects", "", "/v1/%2e%2e/x", "/v1/a b", "/v1/é", "/v1\\x", "/v1/a\n", "/v1/a#frag"]) {
    await assert.rejects(mgmtGet(path, "tok", z.array(z.unknown()), send), /must look like/, path);
  }
  assert.equal(seen.length, 0);
});
