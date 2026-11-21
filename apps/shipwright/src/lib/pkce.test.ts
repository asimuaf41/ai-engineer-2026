import assert from "node:assert/strict";
import { test } from "node:test";
import { challengeFor, isValidVerifier, newVerifier } from "./pkce.ts";

test("the fingerprint matches the official example in RFC 7636 (appendix B)", () => {
  assert.equal(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("verifiers are 43 characters of url-safe text and never repeat", () => {
  const seen = new Set(Array.from({ length: 200 }, () => newVerifier()));
  assert.equal(seen.size, 200);
  for (const verifier of seen) {
    assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(isValidVerifier(verifier), true);
  }
});

test("a challenge is not the verifier, and has no padding or unsafe characters", () => {
  const verifier = newVerifier();
  const challenge = challengeFor(verifier);
  assert.notEqual(challenge, verifier);
  assert.match(challenge, /^[A-Za-z0-9_-]{43}$/);
});

test("isValidVerifier rejects anything that could not be a verifier", () => {
  for (const bad of ["", "short", "a".repeat(42), "a".repeat(129), `${"a".repeat(43)}=`, `${"a".repeat(42)} `, "a".repeat(42) + "\n", undefined, null, 5, ["a"]]) {
    assert.equal(isValidVerifier(bad), false, `value ${JSON.stringify(bad)}`);
  }
});
