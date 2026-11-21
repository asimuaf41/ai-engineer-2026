// Fake data for the design preview at /design/connect. Nothing here is real, and the real page never imports this file.
import type { ConnectInput, ProjectOption, RepoOption } from "@/lib/connect/state";

const INSTALL_URL = "https://github.com/settings/installations";

const REPOS: RepoOption[] = [
  { fullName: "acme-labs/shop-frontend", private: true, defaultBranch: "main", pushedAt: "2026-11-12T09:30:00Z" },
  { fullName: "acme-labs/shop-api", private: true, defaultBranch: "main", pushedAt: "2026-11-10T16:05:00Z" },
  { fullName: "acme-labs/marketing-site", private: false, defaultBranch: "main", pushedAt: "2026-10-02T11:00:00Z" },
  { fullName: "acme-labs/design-tokens", private: false, defaultBranch: "trunk", pushedAt: "2026-06-18T08:00:00Z" },
  { fullName: "acme-labs/old-prototype", private: true, defaultBranch: "master", pushedAt: null },
];

// 120 repositories, to show the "first 50" cap and the search.
const MANY_REPOS: RepoOption[] = Array.from({ length: 120 }, (_, index) => ({
  fullName: `acme-labs/service-${String(index).padStart(3, "0")}`,
  private: index % 3 === 0,
  defaultBranch: "main",
  pushedAt: index % 10 === 0 ? null : `2026-${String((index % 11) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}T10:00:00Z`,
}));

const PROJECTS: ProjectOption[] = [
  { ref: "abcdefghijklmnopqrst", name: "Shop (production)", region: "eu-west-1", status: "ACTIVE_HEALTHY" },
  { ref: "bcdefghijklmnopqrstu", name: "Shop (staging)", region: "eu-west-1", status: "INACTIVE" },
  { ref: "cdefghijklmnopqrstuv", name: "Marketing", region: "us-east-1", status: "COMING_UP" },
];

const connectedRepo = { fullName: "acme-labs/shop-frontend", defaultBranch: "main" } as const;
const connectedProject = { ref: "abcdefghijklmnopqrst", name: "Shop (production)", region: "eu-west-1" } as const;

const base: ConnectInput = { role: "owner", github: { status: "not_connected" }, supabase: { status: "not_connected" }, skipSupabase: false };
const githubDone: ConnectInput["github"] = { status: "connected", repo: connectedRepo, installUrl: INSTALL_URL };

export const FIXTURES = {
  "not-connected": base,
  "coming-soon": { ...base, github: { status: "coming_soon" }, supabase: { status: "coming_soon" } },
  pending: { ...base, github: { status: "pending_approval" } },
  "pick-repo": { ...base, github: { status: "pick_repo", repos: REPOS, installUrl: INSTALL_URL } },
  "many-repos": { ...base, github: { status: "pick_repo", repos: MANY_REPOS, installUrl: INSTALL_URL } },
  "no-repos": { ...base, github: { status: "no_repos", installUrl: INSTALL_URL } },
  "github-error": { ...base, github: { status: "error", code: "rate_limited" } },
  "needs-reconnect": { ...base, github: { status: "needs_reconnect" } },
  step2: { ...base, github: githubDone },
  "pick-project": { ...base, github: githubDone, supabase: { status: "pick_project", projects: PROJECTS } },
  "no-projects": { ...base, github: githubDone, supabase: { status: "no_projects" } },
  "supabase-error": { ...base, github: githubDone, supabase: { status: "error", code: "supabase_failed" } },
  ready: { ...base, github: githubDone, supabase: { status: "connected", project: connectedProject } },
  "ready-skipped": { ...base, github: githubDone, skipSupabase: true },
  member: { ...base, role: "member", github: { status: "pick_repo", repos: REPOS, installUrl: INSTALL_URL } },
  "member-ready": { ...base, role: "member", github: githubDone, supabase: { status: "connected", project: connectedProject } },
} satisfies Record<string, ConnectInput>;

export type FixtureName = keyof typeof FIXTURES;
export const FIXTURE_NAMES = Object.keys(FIXTURES) as FixtureName[];

// The address bar is untrusted, so the name is checked against our own list (Object.hasOwn: "__proto__" etc. are not names).
export const isFixtureName = (value: unknown): value is FixtureName => typeof value === "string" && Object.hasOwn(FIXTURES, value);
