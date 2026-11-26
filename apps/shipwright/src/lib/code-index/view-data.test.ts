import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCost, formatUtc, relativeTime, shortSha } from "./view-data.ts";

test("a commit is shown as its first 7 characters", () => {
  assert.equal(shortSha("abcdef0123456789abcdef0123456789abcdef01"), "abcdef0");
});

test("cost: cents normally, more digits for tiny amounts, zero as $0", () => {
  assert.equal(formatCost(0), "$0");
  assert.equal(formatCost(0.0004), "$0.0004");
  assert.equal(formatCost(0.0149), "$0.01");
  assert.equal(formatCost(0.02), "$0.02");
  assert.equal(formatCost(1.5), "$1.50");
});

test("dates are printed in UTC, the same on the server and in the browser", () => {
  assert.equal(formatUtc("2026-11-24T09:05:00Z"), "24 Nov 2026, 09:05 UTC");
});

test("relative time: just now, minutes, hours, days", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const ago = (seconds: number) => relativeTime(new Date(now.getTime() - seconds * 1000).toISOString(), now);
  assert.equal(ago(10), "just now");
  assert.equal(ago(120), "2 min ago");
  assert.equal(ago(60 * 59), "59 min ago");
  assert.equal(ago(3600 * 3), "3 hours ago");
  assert.equal(ago(86400 * 2), "2 days ago");
  assert.equal(relativeTime("not a date", now), "");
});
