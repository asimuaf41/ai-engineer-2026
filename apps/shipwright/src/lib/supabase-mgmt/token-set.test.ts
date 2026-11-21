import assert from "node:assert/strict";
import { test } from "node:test";
import { needsRefresh, parseTokenSet, REFRESH_MARGIN_SECONDS, serializeTokenSet, tokenSetFromResponse, type TokenSet } from "./token-set.ts";

const NOW = 1_800_000_000;
const set = (expiresAt: number): TokenSet => ({ access_token: "access-1", refresh_token: "refresh-1", expires_at: expiresAt });

test("a token set survives being saved and read back", () => {
  const original = set(NOW + 3600);
  assert.deepEqual(parseTokenSet(serializeTokenSet(original)), original);
});

test("anything that is not a valid token set reads as null, never as an error", () => {
  for (const text of ["", "nope", "null", "[]", "{}", '{"access_token":"a"}', '{"access_token":"a","refresh_token":"b","expires_at":"soon"}', '{"access_token":"","refresh_token":"b","expires_at":5}', '{"access_token":"a","refresh_token":"b","expires_at":1.5}']) {
    assert.equal(parseTokenSet(text), null, `text ${JSON.stringify(text)}`);
  }
});

test("the margin is two minutes", () => {
  assert.equal(REFRESH_MARGIN_SECONDS, 120);
});

test("a token is renewed once 2 minutes or less are left, and not before", () => {
  assert.equal(needsRefresh(set(NOW + 3600), NOW), false);
  assert.equal(needsRefresh(set(NOW + 121), NOW), false);
  assert.equal(needsRefresh(set(NOW + 120), NOW), true);
  assert.equal(needsRefresh(set(NOW + 1), NOW), true);
  assert.equal(needsRefresh(set(NOW - 500), NOW), true);
});

test("the expiry time comes from the expires_in Supabase sent, not from a number we picked", () => {
  assert.equal(tokenSetFromResponse({ access_token: "a", refresh_token: "r", expires_in: 3600 }, undefined, NOW)?.expires_at, NOW + 3600);
  assert.equal(tokenSetFromResponse({ access_token: "a", refresh_token: "r", expires_in: 90 }, undefined, NOW)?.expires_at, NOW + 90);
});

test("a rotated refresh token replaces the old one, and a missing one keeps the old one", () => {
  assert.equal(tokenSetFromResponse({ access_token: "a", refresh_token: "NEW", expires_in: 60 }, "OLD", NOW)?.refresh_token, "NEW");
  assert.equal(tokenSetFromResponse({ access_token: "a", expires_in: 60 }, "OLD", NOW)?.refresh_token, "OLD");
});

test("no refresh token anywhere gives null (we could never renew it)", () => {
  assert.equal(tokenSetFromResponse({ access_token: "a", expires_in: 60 }, undefined, NOW), null);
});
