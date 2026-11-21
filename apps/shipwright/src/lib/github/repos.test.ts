// Proves the two GitHub list calls with a FAKE network (no real GitHub App needed): paging, flattening, sorting and errors.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Octokit } from "octokit";
import { explainGitHubError } from "./errors.ts";
import { listReposWith, userCanSeeInstallationWith } from "./repos.ts";

type Page = { body: unknown; status?: number; headers?: Record<string, string> };

// A pretend GitHub: serves the pages in order and remembers which URLs were asked for.
function fakeGitHub(pages: Page[]) {
  const urls: string[] = [];
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    const asked = String(url);
    urls.push(asked);
    const page = new URL(asked).searchParams.get("page");
    const index = page ? Number(page) - 1 : 0;
    const found = pages[index] ?? { body: { total_count: 0, repositories: [], installations: [] } };
    const response = new Response(JSON.stringify(found.body), {
      status: found.status ?? 200,
      headers: { "content-type": "application/json", ...found.headers },
    });
    // A real response knows its own address, and Octokit reads it. A hand-made one doesn't, so we set it.
    Object.defineProperty(response, "url", { value: asked });
    return response;
  };
  // Retries and throttling are switched off: the real app keeps them, but a test must never wait for GitHub's clock.
  const octokit = new Octokit({ request: { fetch }, retry: { enabled: false }, throttle: { enabled: false } });
  return { octokit, urls };
}

const next = (path: string, page: number) => ({ link: `<https://api.github.com/${path}?per_page=100&page=${page}>; rel="next"` });
const repo = (fullName: string, pushedAt: string | null, isPrivate = false) => ({
  full_name: fullName,
  private: isPrivate,
  default_branch: "main",
  pushed_at: pushedAt,
});

test("repositories from three pages come back as one list, newest push first, never-pushed last", async () => {
  const { octokit, urls } = fakeGitHub([
    { body: { total_count: 5, repositories: [repo("acme/a", "2026-01-01T00:00:00Z"), repo("acme/b", null)] }, headers: next("installation/repositories", 2) },
    { body: { total_count: 5, repositories: [repo("acme/c", "2026-03-01T00:00:00Z", true), repo("acme/d", "2026-02-01T00:00:00Z")] }, headers: next("installation/repositories", 3) },
    { body: { total_count: 5, repositories: [repo("acme/e", "2025-12-01T00:00:00Z")] } },
  ]);

  const repos = await listReposWith(octokit);

  assert.deepEqual(repos.map((r) => r.fullName), ["acme/c", "acme/d", "acme/a", "acme/e", "acme/b"]);
  assert.equal(urls.length, 3);
  assert.deepEqual(repos[0], { fullName: "acme/c", private: true, defaultBranch: "main", pushedAt: "2026-03-01T00:00:00Z" });
  assert.equal(repos.at(-1)?.pushedAt, null);
});

test("no repositories shared gives an empty list", async () => {
  const { octokit } = fakeGitHub([{ body: { total_count: 0, repositories: [] } }]);
  assert.deepEqual(await listReposWith(octokit), []);
});

test("a GitHub that never stops paging is cut off at 20 pages, so the work stays bounded", async () => {
  const urls: string[] = [];
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    const asked = String(url);
    urls.push(asked);
    const page = Number(new URL(asked).searchParams.get("page") ?? "1");
    const response = new Response(JSON.stringify({ total_count: 9999, repositories: [repo(`acme/r${page}`, "2026-01-01T00:00:00Z")] }), {
      headers: { "content-type": "application/json", ...next("installation/repositories", page + 1) },
    });
    Object.defineProperty(response, "url", { value: asked });
    return response;
  };
  const octokit = new Octokit({ request: { fetch }, retry: { enabled: false }, throttle: { enabled: false } });
  const repos = await listReposWith(octokit);
  assert.equal(urls.length, 20);
  assert.equal(repos.length, 20);
});

test("an error on page 2 stops the whole listing with that error", async () => {
  const { octokit } = fakeGitHub([
    { body: { total_count: 2, repositories: [repo("acme/a", null)] }, headers: next("installation/repositories", 2) },
    { body: { message: "nope" }, status: 403, headers: { "x-ratelimit-remaining": "0" } },
  ]);
  await assert.rejects(listReposWith(octokit), (error: unknown) => explainGitHubError(error).kind === "rate_limit");
});

test("an installation found on page 2 is accepted, and the search stops there", async () => {
  const { octokit, urls } = fakeGitHub([
    { body: { total_count: 3, installations: [{ id: 1 }, { id: 2 }] }, headers: next("user/installations", 2) },
    { body: { total_count: 3, installations: [{ id: 3 }] }, headers: next("user/installations", 3) },
    { body: { total_count: 3, installations: [{ id: 4 }] } },
  ]);
  assert.equal(await userCanSeeInstallationWith(octokit, 3), true);
  assert.equal(urls.length, 2);
});

test("an installation the user cannot see (someone else's id) is refused after all pages", async () => {
  const { octokit, urls } = fakeGitHub([
    { body: { total_count: 2, installations: [{ id: 1 }] }, headers: next("user/installations", 2) },
    { body: { total_count: 2, installations: [{ id: 2 }] } },
  ]);
  assert.equal(await userCanSeeInstallationWith(octokit, 999_999), false);
  assert.equal(urls.length, 2);
});

test("a user with no installations at all is refused", async () => {
  const { octokit } = fakeGitHub([{ body: { total_count: 0, installations: [] } }]);
  assert.equal(await userCanSeeInstallationWith(octokit, 5), false);
});

test("GitHub errors keep their status, so they can be explained in plain English", async () => {
  for (const [status, headers, kind] of [
    [401, {}, "auth"],
    [404, {}, "not_found"],
    [403, { "x-ratelimit-remaining": "0" }, "rate_limit"],
  ] as const) {
    const { octokit } = fakeGitHub([{ body: { message: "nope" }, status, headers }]);
    await assert.rejects(listReposWith(octokit), (error: unknown) => explainGitHubError(error).kind === kind);
  }
});
