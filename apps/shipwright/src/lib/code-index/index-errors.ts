// What a founder reads when an index run fails, and the short code we keep in the audit log. Pure: no I/O.
//
// Errors are recognised by their `name` (set by our own error classes), so this file imports nothing server-only and can be
// unit-tested. The message is ALWAYS our own wording: text from the original error is never copied into it, because errors can
// carry things we don't want to show or store. The code is short and safe: a name, plus a status or database code if there is one.
export type IndexFailure = { message: string; code: string };

const statusOf = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
};
const codeOf = (error: unknown): string | undefined => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^[A-Za-z0-9_.-]{1,40}$/.test(code) ? code : undefined;
};

// The message the founder reads ends with the short code, so a screenshot is enough to tell us what failed.
export function explainIndexError(error: unknown): IndexFailure {
  const { message, code } = explain(error);
  return { code, message: `${message} (code: ${code})` };
}

function explain(error: unknown): IndexFailure {
  const name = error instanceof Error ? error.name : "";
  const status = statusOf(error);

  switch (name) {
    case "RepoTooBigError":
      return {
        code: "repo_too_big",
        message:
          "This repo is bigger than 200 MB, which is more than we can index today. Remove large files from the repo (or index a smaller one) and try again.",
      };
    case "RepoNotFoundError":
      return {
        code: "github_access",
        message:
          "GitHub access was removed, or no longer includes this repo. Open Connect your app, reconnect GitHub, and make sure Shipwright can see this repository.",
      };
    case "RepoFetchError":
      return {
        code: status ? `github_${status}` : "github_failed",
        message: "GitHub didn't send us your code this time. Nothing was changed. Please try again in a few minutes.",
      };
    case "EmbeddingError":
      if (status === 401) {
        return {
          code: "embed_401",
          message: "Our AI provider turned us away. This is a problem on our side, not yours. Please try again later.",
        };
      }
      if (status === 400) {
        return {
          code: "embed_400",
          message: "Our AI provider couldn't read part of your code. Nothing was changed. Please try again, and tell us if it keeps happening.",
        };
      }
      return {
        code: status ? `embed_${status}` : "embed_network",
        message: "Our AI provider is busy. Please try again in a few minutes.",
      };
    case "ChunkLimitError":
      return {
        code: "too_many_chunks",
        message:
          "This repo has more code than we can index in one go (over 20,000 pieces). Remove generated or copied-in folders, or index a smaller repo.",
      };
    case "CodeIndexError":
      return {
        code: `db_${codeOf(error) ?? "unknown"}`,
        message: "We couldn't save your index just now. Nothing was lost. Please try again in a few minutes.",
      };
    case "IndexTooSlowError":
      return {
        code: "too_slow",
        message:
          "This repo is too big to index in one go at the speed our AI provider allows us right now. Nothing was changed and nothing was paid for. Please try again later, or index a smaller repo.",
      };
    case "IndexTimeoutError":
      return {
        code: "timed_out",
        message: "Indexing took longer than it is allowed to and was stopped. Please try again.",
      };
    default:
      return {
        code: "unknown",
        message: "Something went wrong on our side while indexing. Nothing was lost. Please try again in a few minutes.",
      };
  }
}
