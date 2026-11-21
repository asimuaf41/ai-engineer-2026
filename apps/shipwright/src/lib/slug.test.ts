import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSlug, randomSuffix, slugify, SLUG_PATTERN } from "./slug.ts";

test("a normal name becomes a lowercase dashed word", () => {
  assert.equal(slugify("Acme Labs"), "acme-labs");
  assert.equal(slugify("  Acme   Labs  "), "acme-labs");
  assert.equal(slugify("Acme_Labs.io"), "acme-labs-io");
});

test("accents are removed and symbols become dashes", () => {
  assert.equal(slugify("Café Münch"), "cafe-munch");
  assert.equal(slugify("R&D / Platform!!"), "r-d-platform");
  assert.equal(slugify("---Edge---"), "edge");
});

test("a very long name is cut at 30 characters and never ends in a dash", () => {
  const slug = slugify("This is an extremely long workspace name that keeps going");
  assert.ok(slug.length <= 30);
  assert.doesNotMatch(slug, /-$/);
  // A cut that lands right after a dash:
  assert.doesNotMatch(slugify("a".repeat(29) + " b"), /-$/);
});

test("a name with nothing usable falls back to 'workspace'", () => {
  for (const name of ["", "   ", "!!!", "日本語", "---", "😀"]) assert.equal(slugify(name), "workspace", JSON.stringify(name));
});

test("the random ending is 4 letters or digits and varies", () => {
  const seen = new Set(Array.from({ length: 200 }, () => randomSuffix()));
  for (const suffix of seen) assert.match(suffix, /^[a-z0-9]{4}$/);
  assert.ok(seen.size > 150);
});

test("a finished slug always fits the database rule, whatever the name", () => {
  const names = ["Acme Labs", "a", "ab", "A", "日本語", "x".repeat(200), "Café — Münch & Söhne GmbH", "9 lives", "-", "!!!", "name with 😀 emoji", "UPPER", "a-b-c-d-e-f-g-h-i-j-k-l-m-n-o-p-q-r-s-t"];
  for (const name of names) {
    const slug = makeSlug(name);
    assert.match(slug, SLUG_PATTERN, `${JSON.stringify(name)} -> ${slug}`);
    assert.ok(slug.length <= 35);
  }
});

test("makeSlug adds the given ending, so a clash can be retried with a new one", () => {
  assert.equal(makeSlug("Acme Labs", "x7k2"), "acme-labs-x7k2");
  assert.notEqual(makeSlug("Acme Labs", "aaaa"), makeSlug("Acme Labs", "bbbb"));
});

test("the pattern rejects what the database rejects", () => {
  for (const bad of ["", "a", "ab", "-abc", "abc-", "ABC-def", "a b-c", "a_b-c", "é-abc", "a".repeat(41)]) assert.doesNotMatch(bad, SLUG_PATTERN, JSON.stringify(bad));
  for (const good of ["abc", "a-b", "acme-labs-x7k2", "9-lives-abcd", "a".repeat(40)]) assert.match(good, SLUG_PATTERN, good);
});
