import assert from "node:assert/strict";
import { test } from "node:test";
import { explainSupabaseError, MgmtApiError, NeedsReconnectError, SupabaseOAuthError } from "./errors.ts";

const reconnect = /connect Supabase again/;

test("a connection that needs authorizing again says so", () => {
  assert.match(explainSupabaseError(new NeedsReconnectError()), reconnect);
  assert.match(explainSupabaseError(new SupabaseOAuthError(400)), reconnect);
  assert.match(explainSupabaseError(new SupabaseOAuthError(401)), reconnect);
  assert.match(explainSupabaseError(new MgmtApiError(401)), reconnect);
  assert.match(explainSupabaseError(new MgmtApiError(403)), reconnect);
});

test("rate limits ask the person to wait a minute", () => {
  assert.match(explainSupabaseError(new SupabaseOAuthError(429)), /Wait a minute/);
  assert.match(explainSupabaseError(new MgmtApiError(429)), /Wait a minute/);
});

test("everything else is a calm generic message with no codes", () => {
  for (const error of [new SupabaseOAuthError(500), new MgmtApiError(500), new MgmtApiError(502), new Error("boom"), "text", null, undefined]) {
    const message = explainSupabaseError(error);
    assert.match(message, /Something went wrong/);
    assert.doesNotMatch(message, /\d{3}|token|boom/i);
  }
});

test("error objects carry only a status, and sort themselves", () => {
  const error = new SupabaseOAuthError(400);
  assert.equal(error.kind, "invalid_grant");
  assert.equal(new SupabaseOAuthError(429).kind, "rate_limited");
  assert.equal(new SupabaseOAuthError(500).kind, "failed");
  assert.equal(error.message, "Supabase OAuth request failed with status 400");
  assert.equal(new MgmtApiError(404).message, "Supabase API request failed with status 404");
});
