// The two GitHub list calls we need, written against ANY Octokit you pass in (so tests can use a fake network).
// app.ts hands them the real, authenticated Octokit.
import type { Octokit } from "octokit";

export type InstallationRepo = {
  fullName: string;
  private: boolean;
  defaultBranch: string;
  pushedAt: string | null;
};

const PER_PAGE = 100;
// A safety cap: 20 pages x 100 = 2,000 repositories is far more than a first connect screen needs, and it bounds the work.
const MAX_PAGES = 20;

// Repositories the app installation can access, newest push first.
export async function listReposWith(octokit: Octokit): Promise<InstallationRepo[]> {
  const repos: InstallationRepo[] = [];
  let pages = 0;
  for await (const response of octokit.paginate.iterator("GET /installation/repositories", { per_page: PER_PAGE })) {
    for (const repo of response.data) {
      repos.push({
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        pushedAt: repo.pushed_at ?? null,
      });
    }
    pages += 1;
    if (pages >= MAX_PAGES) break;
  }
  return repos.sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
}

// Does this USER (whose token the octokit carries) have access to the installation? This is the check that stops someone
// from claiming an installation that belongs to somebody else: GitHub's redirect carries an installation_id anyone can edit.
export async function userCanSeeInstallationWith(octokit: Octokit, installationId: number): Promise<boolean> {
  let pages = 0;
  for await (const response of octokit.paginate.iterator("GET /user/installations", { per_page: PER_PAGE })) {
    if (response.data.some((installation) => installation.id === installationId)) return true;
    pages += 1;
    if (pages >= MAX_PAGES) break;
  }
  return false;
}
