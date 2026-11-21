import assert from "node:assert/strict";
import { test } from "node:test";
import { describeForLog, explainGitHubError } from "./errors.ts";

// Octokit's RequestError looks like this: a number `status` and `response.headers`.
const requestError = (status: number, headers: Record<string, string> = {}, message = "boom") =>
  Object.assign(new Error(message), { status, response: { headers } });

test("401 means GitHub did not accept our credentials", () => {
  assert.equal(explainGitHubError(requestError(401)).kind, "auth");
});

test("403 with no rate-limit signs is a permission problem", () => {
  assert.equal(explainGitHubError(requestError(403)).kind, "permission");
});

test("403 or 429 with the limit used up is a rate limit (primary limit)", () => {
  assert.equal(explainGitHubError(requestError(403, { "x-ratelimit-remaining": "0" })).kind, "rate_limit");
  assert.equal(explainGitHubError(requestError(429)).kind, "rate_limit");
});

test("403 with retry-after, or a secondary-limit message, is a rate limit", () => {
  assert.equal(explainGitHubError(requestError(403, { "retry-after": "60" })).kind, "rate_limit");
  assert.equal(explainGitHubError(requestError(403, {}, "You have exceeded a secondary rate limit")).kind, "rate_limit");
});

test("404 means the installation was not found", () => {
  assert.equal(explainGitHubError(requestError(404)).kind, "not_found");
});

test("anything else, and things that are not request errors, are 'unknown'", () => {
  for (const error of [requestError(500), requestError(422), new Error("network down"), "text", null, undefined, { status: "403" }]) {
    assert.equal(explainGitHubError(error).kind, "unknown");
  }
});

test("every kind has a plain-English message with no technical terms", () => {
  for (const status of [401, 403, 404, 429, 500]) {
    const { message } = explainGitHubError(requestError(status));
    assert.match(message, /^[A-Z].*[.]$/);
    assert.doesNotMatch(message, /\b(401|403|404|429|500|token|octokit|http)\b/i);
  }
});

test("the log line has only status, kind, request id and ids, never the message text", () => {
  const error = requestError(403, { "x-github-request-id": "ABCD:1234" }, "secret-looking message ghu_ABCDEF");
  const line = describeForLog(explainGitHubError(error), { installation: 42, org: undefined });
  assert.equal(line, "status=403 kind=permission request_id=ABCD:1234 installation=42");
  assert.doesNotMatch(line, /ghu_|secret/);
});
