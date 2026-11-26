// Turns a failed GitHub call into plain English for the person, and a safe line for the log.
// Pure code: it only looks at the shape of the error (Octokit's RequestError has .status and .response.headers).
// The log line holds ONLY a status, a kind and GitHub's request id. Never a token, a message body or a name.
export type GitHubErrorKind = "auth" | "rate_limit" | "permission" | "not_found" | "unknown";

export type GitHubErrorInfo = {
  kind: GitHubErrorKind;
  status?: number;
  requestId?: string;
  // Safe to show to the person.
  message: string;
};

const MESSAGES: Record<GitHubErrorKind, string> = {
  auth: "GitHub didn't accept Shipwright's credentials. Please connect GitHub again.",
  rate_limit: "GitHub is limiting requests right now. Wait a few minutes, then try again.",
  permission: "GitHub says Shipwright doesn't have permission to do that. Check the app's access on GitHub, then try again.",
  not_found: "We couldn't find that GitHub installation. It may have been removed. Please connect GitHub again.",
  unknown: "Something went wrong talking to GitHub. Please try again.",
};

type Headers = Record<string, string | number | undefined>;

function readRequestError(error: unknown): { status: number; headers: Headers; text: string } | null {
  if (typeof error !== "object" || error === null) return null;
  const { status, response, message } = error as { status?: unknown; response?: { headers?: Headers }; message?: unknown };
  if (typeof status !== "number") return null;
  return { status, headers: response?.headers ?? {}, text: typeof message === "string" ? message.toLowerCase() : "" };
}

export function explainGitHubError(error: unknown): GitHubErrorInfo {
  const found = readRequestError(error);
  if (!found) return { kind: "unknown", message: MESSAGES.unknown };

  const { status, headers, text } = found;
  const requestId = typeof headers["x-github-request-id"] === "string" ? headers["x-github-request-id"] : undefined;
  const limited =
    status === 429 ||
    (status === 403 &&
      (String(headers["x-ratelimit-remaining"]) === "0" || headers["retry-after"] !== undefined || text.includes("rate limit")));

  const kind: GitHubErrorKind = limited ? "rate_limit" : status === 401 ? "auth" : status === 403 ? "permission" : status === 404 ? "not_found" : "unknown";
  return { kind, status, requestId, message: MESSAGES[kind] };
}

// The error's name and the first 80 characters of its message, for the log. Never the stack. Any long token-like run is blanked.
export function describeThrown(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const raw = error instanceof Error ? error.message : "";
  const message = raw.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[hidden]").slice(0, 80);
  return `error_name=${name} error_message=${JSON.stringify(message)}`;
}

// For console.warn: status, kind and request id, plus the error's name and the start of its message.
export function describeForLog(info: GitHubErrorInfo, ids: Record<string, string | number | undefined> = {}, error?: unknown): string {
  const extra = Object.entries(ids)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);
  const thrown = error === undefined ? [] : [describeThrown(error)];
  return [`status=${info.status ?? "none"}`, `kind=${info.kind}`, `request_id=${info.requestId ?? "none"}`, ...extra, ...thrown].join(" ");
}
