import assert from "node:assert/strict";
import { test } from "node:test";
import { explainIndexError } from "./index-errors.ts";

// Our real error classes are server-only, so the tests build look-alikes: same name, same status/code fields.
const fail = (name: string, extra: Record<string, unknown> = {}, message = "SECRET-DETAIL sk-ant-should-never-show") =>
  Object.assign(new Error(message), { name, ...extra });

test("a repo over 200 MB says so", () => {
  const result = explainIndexError(fail("RepoTooBigError"));
  assert.equal(result.code, "repo_too_big");
  assert.match(result.message, /bigger than 200 MB/);
});

test("lost GitHub access tells the founder to reconnect", () => {
  const result = explainIndexError(fail("RepoNotFoundError"));
  assert.equal(result.code, "github_access");
  assert.match(result.message, /GitHub access was removed/);
});

test("other GitHub failures keep only the status in the code", () => {
  assert.equal(explainIndexError(fail("RepoFetchError", { status: 502 })).code, "github_502");
  assert.equal(explainIndexError(fail("RepoFetchError")).code, "github_failed");
});

test("the AI provider: busy (429, 5xx, network) vs rejected key (401) vs bad request (400)", () => {
  for (const status of [429, 500, 503, undefined]) {
    const result = explainIndexError(fail("EmbeddingError", { status }));
    assert.match(result.message, /AI provider is busy/, String(status));
  }
  assert.equal(explainIndexError(fail("EmbeddingError", { status: 429 })).code, "embed_429");
  assert.match(explainIndexError(fail("EmbeddingError", { status: 429 })).message, /busy\. Please try again in a few minutes\. \(code: embed_429\)$/);
  assert.equal(explainIndexError(fail("EmbeddingError")).code, "embed_network");
  assert.equal(explainIndexError(fail("EmbeddingError", { status: 401 })).code, "embed_401");
  assert.match(explainIndexError(fail("EmbeddingError", { status: 401 })).message, /problem on our side/);
  assert.equal(explainIndexError(fail("EmbeddingError", { status: 400 })).code, "embed_400");
});

test("too many chunks, a database failure and a timeout each have their own message", () => {
  assert.equal(explainIndexError(fail("ChunkLimitError")).code, "too_many_chunks");
  assert.match(explainIndexError(fail("ChunkLimitError")).message, /20,000/);
  assert.equal(explainIndexError(fail("CodeIndexError", { code: "23505" })).code, "db_23505");
  assert.equal(explainIndexError(fail("CodeIndexError")).code, "db_unknown");
  assert.equal(explainIndexError(fail("IndexTimeoutError")).code, "timed_out");
  assert.equal(explainIndexError(fail("IndexTooSlowError")).code, "too_slow");
  assert.match(explainIndexError(fail("IndexTooSlowError")).message, /nothing was paid for.*\(code: too_slow\)$/i);
});

test("anything else is a calm generic message", () => {
  // Not an Error (a string, null, or a plain object that only looks like one) is never trusted by name.
  for (const error of [new Error("boom"), "a string", null, undefined, { name: "RepoTooBigError" }]) {
    const result = explainIndexError(error);
    assert.equal(result.code, "unknown");
    assert.match(result.message, /Something went wrong on our side/);
  }
});

test("the founder-facing message never contains text from the original error, and codes stay short and safe", () => {
  const names = ["RepoTooBigError", "RepoNotFoundError", "RepoFetchError", "EmbeddingError", "ChunkLimitError", "CodeIndexError", "IndexTimeoutError", "Whatever"];
  for (const name of names) {
    const result = explainIndexError(fail(name, { status: 500, code: "bad code with spaces and sk-ant-secret" }));
    assert.doesNotMatch(result.message, /SECRET-DETAIL|sk-ant/, name);
    assert.match(result.code, /^[a-z0-9_]{1,40}$/, name);
  }
});
