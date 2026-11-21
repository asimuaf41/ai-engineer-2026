// Tests for the OAuth state: it must accept ONLY a state we made, for this provider, that is not expired and matches the URL.
// Run: pnpm --filter shipwright test:unit
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  decodeUnverified,
  newNonce,
  safeEqual,
  safeSlug,
  signPayload,
  STATE_TTL_SECONDS,
  verifyPayload,
  type StatePayload,
} from "./oauth-state-core.ts";

const SECRET = "a".repeat(44);
const NOW = 1_800_000_000;

const payload = (overrides: Partial<StatePayload> = {}): StatePayload => ({
  nonce: newNonce(),
  orgId: "11111111-1111-1111-1111-111111111111",
  provider: "github",
  extra: { slug: "acme-labs-x7k2" },
  expiresAt: NOW + STATE_TTL_SECONDS,
  ...overrides,
});

const check = (token: string | undefined, stateFromUrl: string, overrides: { secret?: string; provider?: "github" | "supabase" } = {}) =>
  verifyPayload(token, { secret: overrides.secret ?? SECRET, provider: overrides.provider ?? "github", stateFromUrl, now: NOW });

test("a state we made is accepted and gives back the org and the extra values", () => {
  const p = payload();
  const result = check(signPayload(p, SECRET), p.nonce);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.orgId, p.orgId);
    assert.deepEqual(result.payload.extra, { slug: "acme-labs-x7k2" });
  }
});

test("nonces are random, 43 characters, and never repeat", () => {
  const seen = new Set(Array.from({ length: 200 }, newNonce));
  assert.equal(seen.size, 200);
  for (const nonce of seen) assert.equal(nonce.length, 43);
});

test("a changed payload is refused (someone edited the org id)", () => {
  const p = payload();
  const [, mac] = signPayload(p, SECRET).split(".");
  const forgedBody = Buffer.from(JSON.stringify({ ...p, orgId: "22222222-2222-2222-2222-222222222222" })).toString("base64url");
  assert.deepEqual(check(`${forgedBody}.${mac}`, p.nonce), { ok: false, reason: "bad_signature" });
});

test("a changed signature is refused", () => {
  const p = payload();
  const [body, mac] = signPayload(p, SECRET).split(".");
  const flipped = `${mac?.slice(0, -1)}${mac?.endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(check(`${body}.${flipped}`, p.nonce), { ok: false, reason: "bad_signature" });
});

test("a state signed with a different secret is refused", () => {
  const p = payload();
  assert.deepEqual(check(signPayload(p, "b".repeat(44)), p.nonce), { ok: false, reason: "bad_signature" });
});

test("an expired state is refused, one second before it ends is fine", () => {
  const p = payload({ expiresAt: NOW });
  assert.deepEqual(check(signPayload(p, SECRET), p.nonce), { ok: false, reason: "expired" });
  const later = payload({ expiresAt: NOW + 1 });
  assert.equal(check(signPayload(later, SECRET), later.nonce).ok, true);
});

test("a state made for another provider is refused", () => {
  const p = payload({ provider: "supabase" });
  assert.deepEqual(check(signPayload(p, SECRET), p.nonce), { ok: false, reason: "provider" });
});

test("the nonce in the URL must match the cookie (a different or empty state is refused)", () => {
  const p = payload();
  const token = signPayload(p, SECRET);
  assert.deepEqual(check(token, newNonce()), { ok: false, reason: "mismatch" });
  assert.deepEqual(check(token, ""), { ok: false, reason: "mismatch" });
  assert.deepEqual(check(token, `${p.nonce}x`), { ok: false, reason: "mismatch" });
});

test("garbage in the cookie is refused, never a crash", () => {
  for (const token of [undefined, "", ".", "abc", "a.b.c", "....", "💥.💥", "e30.e30"]) {
    const result = check(token, "x");
    assert.equal(result.ok, false, `token ${JSON.stringify(token)}`);
  }
});

test("a correctly signed payload with the wrong shape is refused as malformed", () => {
  const body = Buffer.from(JSON.stringify({ nonce: "n", orgId: "o", provider: "github", extra: { slug: 5 }, expiresAt: NOW + 100 })).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(body).digest("base64url");
  assert.deepEqual(check(`${body}.${mac}`, "n"), { ok: false, reason: "malformed" });
});

test("decodeUnverified reads a payload without trusting it, and returns null for garbage", () => {
  const p = payload();
  assert.equal(decodeUnverified(signPayload(p, "any-other-secret-works-too"))?.extra.slug, "acme-labs-x7k2");
  assert.equal(decodeUnverified("nonsense"), null);
  assert.equal(decodeUnverified(undefined), null);
});

test("safeSlug only lets a real org slug through (it picks a redirect page, so nothing else may pass)", () => {
  assert.equal(safeSlug("acme-labs-x7k2"), "acme-labs-x7k2");
  for (const bad of ["../x", "a/b", "ACME", "-acme", "acme-", "a", "x".repeat(41), "acme\nlabs", "acme labs", "acme?x=1", "", undefined, null, 5, ["acme"]]) {
    assert.equal(safeSlug(bad), undefined, `value ${JSON.stringify(bad)}`);
  }
});

test("an `extra` that is a list is refused as malformed", () => {
  const body = Buffer.from(JSON.stringify({ nonce: "n", orgId: "o", provider: "github", extra: ["a"], expiresAt: NOW + 100 })).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(body).digest("base64url");
  assert.deepEqual(check(`${body}.${mac}`, "n"), { ok: false, reason: "malformed" });
});

test("safeEqual: equal strings match, different or different-length strings do not", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", ""), true);
});
