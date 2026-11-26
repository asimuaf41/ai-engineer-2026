// Tests for the connect page's logic: which step is open, what each ?error= says, and the text helpers.
import assert from "node:assert/strict";
import { test } from "node:test";
import { connectErrorFor, type ConnectErrorCode } from "./errors.ts";
import { formatPushed, projectStatusLabel } from "./format.ts";
import { connectHrefs, retryHrefFor } from "./links.ts";
import { filterBy, MAX_VISIBLE, newestFirst } from "./search.ts";
import { deriveConnectState, type ConnectInput, type GitHubStep, type SupabaseStep } from "./state.ts";

const connectedRepo: GitHubStep = { status: "connected", repo: { appId: "00000000-0000-4000-8000-000000000001", fullName: "acme/shop", defaultBranch: "main" }, installUrl: "https://github.com/settings/installations" };
const connectedProject: SupabaseStep = { status: "connected", project: { ref: "abcdefghijklmnopqrst", name: "Shop", region: "eu-west-1" } };

const input = (overrides: Partial<ConnectInput> = {}): ConnectInput => ({
  role: "owner",
  github: { status: "not_connected" },
  supabase: { status: "not_connected" },
  skipSupabase: false,
  ...overrides,
});

// ---------- which step is open ----------

test("until a repository is chosen, step 1 is open and the rest wait (every step-1 status)", () => {
  const steps: GitHubStep[] = [
    { status: "coming_soon" },
    { status: "not_connected" },
    { status: "pending_approval" },
    { status: "no_repos", installUrl: "u" },
    { status: "pick_repo", repos: [], installUrl: "u" },
    { status: "needs_reconnect" },
    { status: "error", code: "unknown" },
  ];
  for (const github of steps) {
    assert.deepEqual(deriveConnectState(input({ github })), { canManage: true, github: "active", supabase: "upcoming", ready: "upcoming", active: "github" }, github.status);
  }
});

test("a chosen repository opens step 2", () => {
  assert.deepEqual(deriveConnectState(input({ github: connectedRepo })), { canManage: true, github: "done", supabase: "active", ready: "upcoming", active: "supabase" });
});

test("a chosen project opens step 3 and marks step 2 done", () => {
  assert.deepEqual(deriveConnectState(input({ github: connectedRepo, supabase: connectedProject })), { canManage: true, github: "done", supabase: "done", ready: "active", active: "ready" });
});

test("'Skip for now' opens step 3 and marks step 2 skipped", () => {
  assert.deepEqual(deriveConnectState(input({ github: connectedRepo, skipSupabase: true })), { canManage: true, github: "done", supabase: "skipped", ready: "active", active: "ready" });
});

test("when Supabase is 'coming soon' it must not block step 3", () => {
  const state = deriveConnectState(input({ github: connectedRepo, supabase: { status: "coming_soon" } }));
  assert.equal(state.active, "ready");
  assert.equal(state.supabase, "skipped");
});

test("step 2 stays open for reconnecting, errors, and an empty project list", () => {
  for (const supabase of [{ status: "needs_reconnect" }, { status: "error", code: "rate_limited" }, { status: "no_projects" }, { status: "pick_project", projects: [] }] as SupabaseStep[]) {
    assert.equal(deriveConnectState(input({ github: connectedRepo, supabase })).active, "supabase", supabase.status);
  }
});

test("skipping step 2 does nothing while step 1 is not finished", () => {
  assert.equal(deriveConnectState(input({ skipSupabase: true })).active, "github");
});

test("only owners and admins can manage; members see everything read-only", () => {
  assert.equal(deriveConnectState(input({ role: "owner" })).canManage, true);
  assert.equal(deriveConnectState(input({ role: "admin" })).canManage, true);
  assert.equal(deriveConnectState(input({ role: "member" })).canManage, false);
});

// ---------- the ?error= messages ----------

const ALL_CODES: ConnectErrorCode[] = ["github_state", "github_not_yours", "github_failed", "github_not_configured", "supabase_state", "supabase_failed", "supabase_no_org", "supabase_not_configured", "access_denied", "needs_reconnect", "rate_limited", "already_indexing", "indexing_unavailable", "unknown"];

test("no error in the address means no alert", () => {
  assert.equal(connectErrorFor(undefined), null);
  assert.equal(connectErrorFor(""), null);
  assert.equal(connectErrorFor([]), null);
});

test("every known code has its own friendly title and body", () => {
  const titles = new Set<string>();
  for (const code of ALL_CODES) {
    const error = connectErrorFor(code);
    assert.equal(error?.code, code);
    assert.ok(error && error.title.length > 5 && error.body.length > 20, code);
    titles.add(error.title);
  }
  assert.equal(titles.size, ALL_CODES.length, "no two codes share a title");
});

test("messages are plain English: no codes, no technical words, and they say whether anything changed", () => {
  for (const code of ALL_CODES) {
    const { title, body } = connectErrorFor(code) ?? { title: "", body: "" };
    assert.doesNotMatch(`${title} ${body}`, /\b(error|exception|stack|oauth|token|http|\d{3}|null|undefined)\b/i, code);
  }
  for (const code of ["github_state", "github_failed", "supabase_state", "supabase_failed", "unknown"] as const) {
    assert.match(connectErrorFor(code)?.body ?? "", /Nothing was changed/, code);
  }
});

test("anything we don't recognise becomes 'unknown', and is never shown back", () => {
  for (const value of ["<script>alert(1)</script>", "github_state ", "GITHUB_STATE", "__proto__", "constructor", "toString", "hasOwnProperty", "../x", "x".repeat(500), 5, null, {}, ["nope"]]) {
    const error = connectErrorFor(value);
    assert.equal(error?.code, "unknown", JSON.stringify(value));
    assert.doesNotMatch(`${error?.title} ${error?.body}`, /script|proto|constructor|toString|xxxx/i);
  }
});

test("a list of values uses the first one", () => {
  assert.equal(connectErrorFor(["access_denied", "rate_limited"])?.code, "access_denied");
});

test("each error says which step 'Try again' restarts", () => {
  assert.equal(connectErrorFor("github_not_yours")?.retry, "github");
  assert.equal(connectErrorFor("supabase_no_org")?.retry, "supabase");
  assert.equal(connectErrorFor("access_denied")?.retry, "current");
  assert.equal(connectErrorFor("github_not_configured")?.retry, "none");
});

// ---------- addresses and "Try again" ----------

test("the addresses are built from an encoded slug, so a strange slug cannot change the path or add a query", () => {
  const hrefs = connectHrefs("acme-labs-x7k2");
  assert.deepEqual(hrefs, {
    page: "/o/acme-labs-x7k2/connect",
    githubConnect: "/api/github/install?org=acme-labs-x7k2",
    supabaseConnect: "/api/supabase/connect?org=acme-labs-x7k2",
    skip: "/o/acme-labs-x7k2/connect?step=ready",
  });
  const odd = connectHrefs("a/b?x=1&y#z");
  assert.equal(odd.page, "/o/a%2Fb%3Fx%3D1%26y%23z/connect");
  assert.equal(odd.githubConnect, "/api/github/install?org=a%2Fb%3Fx%3D1%26y%23z");
  for (const href of Object.values(odd)) assert.doesNotMatch(href.split("?")[0] ?? "", /[?#&=]/);
});

test("'Try again' restarts the right step for an owner or admin", () => {
  const hrefs = connectHrefs("acme");
  const owner = (active: "github" | "supabase" | "ready") => ({ canManage: true, active });
  assert.equal(retryHrefFor(connectErrorFor("github_not_yours"), owner("ready"), hrefs), hrefs.githubConnect);
  assert.equal(retryHrefFor(connectErrorFor("supabase_no_org"), owner("github"), hrefs), hrefs.supabaseConnect);
  assert.equal(retryHrefFor(connectErrorFor("access_denied"), owner("github"), hrefs), hrefs.githubConnect);
  assert.equal(retryHrefFor(connectErrorFor("rate_limited"), owner("supabase"), hrefs), hrefs.supabaseConnect);
  // Nothing to connect again once everything is done: just look at the page.
  assert.equal(retryHrefFor(connectErrorFor("unknown"), owner("ready"), hrefs), hrefs.page);
});

test("a plain member can only look again, and a feature that isn't switched on has no 'Try again'", () => {
  const hrefs = connectHrefs("acme");
  for (const code of ["github_state", "access_denied", "needs_reconnect", "supabase_failed"] as const) {
    assert.equal(retryHrefFor(connectErrorFor(code), { canManage: false, active: "github" }, hrefs), hrefs.page, code);
  }
  assert.equal(retryHrefFor(connectErrorFor("github_not_configured"), { canManage: true, active: "github" }, hrefs), null);
  assert.equal(retryHrefFor(connectErrorFor("supabase_not_configured"), { canManage: false, active: "github" }, hrefs), null);
  assert.equal(retryHrefFor(null, { canManage: true, active: "github" }, hrefs), null);
});

test("GitHub done, Supabase needing a reconnect, and 'skip' pressed: the skip wins and step 3 opens", () => {
  const state = deriveConnectState(input({ github: connectedRepo, supabase: { status: "needs_reconnect" }, skipSupabase: true }));
  assert.equal(state.active, "ready");
  assert.equal(state.supabase, "skipped");
});

// ---------- text helpers ----------

test("dates are fixed UTC text that never depends on the time zone", () => {
  assert.equal(formatPushed("2026-11-12T23:59:59Z"), "12 Nov 2026");
  assert.equal(formatPushed("2026-09-01T00:00:00Z"), "1 Sep 2026");
  assert.equal(formatPushed("2026-01-05T12:00:00+05:00"), "5 Jan 2026");
  assert.equal(formatPushed(null), "No pushes yet");
  assert.equal(formatPushed("not a date"), "Unknown");
});

test("project statuses become words people know, and unknown ones are not shown raw", () => {
  assert.equal(projectStatusLabel("ACTIVE_HEALTHY"), "Running");
  assert.equal(projectStatusLabel("INACTIVE"), "Paused");
  assert.equal(projectStatusLabel("SOMETHING_NEW"), "Status unknown");
  assert.equal(projectStatusLabel("__proto__"), "Status unknown");
  assert.equal(projectStatusLabel("constructor"), "Status unknown");
});

test("search is case-insensitive, matches anywhere, and an empty search keeps everything", () => {
  const repos = [{ fullName: "acme/Shop-Frontend" }, { fullName: "acme/api" }, { fullName: "other/shop" }];
  const text = (repo: { fullName: string }) => repo.fullName;
  assert.deepEqual(filterBy(repos, "SHOP", text).map(text), ["acme/Shop-Frontend", "other/shop"]);
  assert.deepEqual(filterBy(repos, "  acme/  ", text).map(text), ["acme/Shop-Frontend", "acme/api"]);
  assert.equal(filterBy(repos, "", text).length, 3);
  assert.equal(filterBy(repos, "   ", text).length, 3);
  assert.equal(filterBy(repos, "zzz", text).length, 0);
});

test("search does not treat what you type as a pattern", () => {
  const repos = [{ fullName: "acme/a.b" }, { fullName: "acme/axb" }];
  assert.deepEqual(filterBy(repos, "a.b", (repo) => repo.fullName).map((repo) => repo.fullName), ["acme/a.b"]);
  assert.equal(filterBy(repos, "(", (repo) => repo.fullName).length, 0);
});

test("newest push first, never-pushed last, and the original list is not changed", () => {
  const repos = [{ n: "old", at: "2025-01-01T00:00:00Z" }, { n: "never", at: null }, { n: "new", at: "2026-06-01T00:00:00Z" }, { n: "mid", at: "2025-12-01T00:00:00Z" }];
  assert.deepEqual(newestFirst(repos, (repo) => repo.at).map((repo) => repo.n), ["new", "mid", "old", "never"]);
  assert.equal(repos[0]?.n, "old");
});

test("a long list is cut to 50 shown, but the search still looks through ALL of it", () => {
  const repos = Array.from({ length: 120 }, (_, index) => ({ fullName: `acme/service-${String(index).padStart(3, "0")}` }));
  const text = (repo: { fullName: string }) => repo.fullName;
  assert.equal(MAX_VISIBLE, 50);
  assert.equal(filterBy(repos, "", text).slice(0, MAX_VISIBLE).length, 50);
  // service-119 is far beyond the first 50, yet a search finds it.
  assert.deepEqual(filterBy(repos, "service-119", text).map(text), ["acme/service-119"]);
  assert.equal(filterBy(repos, "service-11", text).length, 10);
});
