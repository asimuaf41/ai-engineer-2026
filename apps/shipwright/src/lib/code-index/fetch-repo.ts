// Downloads one repo at one exact commit and returns its text files. Server only.
//
// Steps: check the repo size, turn the ref into a 40-character commit SHA, download the tarball of THAT SHA (so the files
// match the commit we save), and unpack it in memory (see unpack-repo.ts). Nothing is written to disk, nothing is run.
// We log only the status and the repo name, never file text or tokens.
import "server-only";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { RequestError } from "octokit";
import { installationOctokit } from "@/lib/github/app";
import { unpackRepoTarball, type RepoFile, type SkipReason } from "@/lib/code-index/unpack-repo";

export type { RepoFile, SkipReason };

const MAX_REPO_SIZE_KB = 200 * 1024; // 200 MB, as GitHub reports it
const REPO_NAME = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;

export class RepoTooBigError extends Error {
  constructor(repoFullName: string, sizeKb: number) {
    super(`${repoFullName} is too big to index (${Math.round(sizeKb / 1024)} MB, the limit is 200 MB).`);
    this.name = "RepoTooBigError";
  }
}

export class RepoNotFoundError extends Error {
  constructor() {
    super("Shipwright can't see this repo. Check the GitHub App still has access to it.");
    this.name = "RepoNotFoundError";
  }
}

export class RepoFetchError extends Error {
  status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "RepoFetchError";
    this.status = status;
  }
}

export type FetchedRepo = {
  commitSha: string;
  files: RepoFile[];
  skipped: Record<SkipReason, number>;
  totalBytes: number;
};

type Github = Awaited<ReturnType<typeof installationOctokit>>;

function splitRepoName(repoFullName: string): [string, string] {
  if (!REPO_NAME.test(repoFullName)) throw new RepoFetchError("The repository name is not valid.");
  return repoFullName.split("/") as [string, string];
}

// The exact commit of a branch, tag or sha. The "sha" media type returns just the SHA, not the whole diff.
async function commitShaOf(octokit: Github, owner: string, repo: string, ref: string): Promise<string> {
  const commit = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
    owner,
    repo,
    ref,
    headers: { accept: "application/vnd.github.sha" },
  });
  const commitSha = String(commit.data).trim();
  if (!COMMIT_SHA.test(commitSha)) throw new RepoFetchError("GitHub did not return a commit SHA.");
  return commitSha;
}

// Turns whatever went wrong into one of our three errors. Logs only the status and the repo name.
function toRepoError(repoFullName: string, error: unknown): never {
  if (error instanceof RepoTooBigError || error instanceof RepoFetchError) throw error;
  const status = error instanceof RequestError ? error.status : undefined;
  console.warn(`[fetch-repo] ${repoFullName} failed: status=${status ?? "none"}`);
  if (status === 404 || status === 403 || status === 401) throw new RepoNotFoundError();
  throw new RepoFetchError("Could not download the repository from GitHub.", status);
}

// Just the commit sha of a ref (used to start an index run before the download begins).
export async function resolveCommitSha(input: { installationId: number; repoFullName: string; ref: string }): Promise<string> {
  const [owner, repo] = splitRepoName(input.repoFullName);
  try {
    return await commitShaOf(await installationOctokit(input.installationId), owner, repo, input.ref);
  } catch (error) {
    return toRepoError(input.repoFullName, error);
  }
}

export async function fetchRepo(input: { installationId: number; repoFullName: string; ref: string }): Promise<FetchedRepo> {
  const { installationId, repoFullName, ref } = input;
  const [owner, repo] = splitRepoName(repoFullName);

  try {
    const octokit = await installationOctokit(installationId);

    // 1) Size first: refuse BEFORE downloading anything.
    const meta = await octokit.rest.repos.get({ owner, repo });
    if (meta.data.size > MAX_REPO_SIZE_KB) throw new RepoTooBigError(repoFullName, meta.data.size);

    // 2) The exact commit.
    const commitSha = await commitShaOf(octokit, owner, repo, ref);

    // 3) The tarball of that SHA, as a stream (we never hold the whole download in memory).
    const tarball = await octokit.request("GET /repos/{owner}/{repo}/tarball/{ref}", {
      owner,
      repo,
      ref: commitSha,
      request: { parseSuccessResponseBody: false },
    });
    if (!(tarball.data instanceof ReadableStream)) throw new RepoFetchError("GitHub did not return a download stream.");

    const unpacked = await unpackRepoTarball(Readable.fromWeb(tarball.data as WebReadableStream));
    return { commitSha, ...unpacked };
  } catch (error) {
    return toRepoError(repoFullName, error);
  }
}
