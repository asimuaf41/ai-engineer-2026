# 0011 — Public demo: daily quota and a side menu on the phone

Date: 2026-11-11 · Status: Accepted

## Context

We share Shipwright (web and phone) on LinkedIn and with clients. `/api/chat` calls real Claude with our own
`ANTHROPIC_API_KEY`, and the only guard was an in-memory limit that Vercel resets and splits across servers. We also
want the phone app to look impressive without changing its structure.

## Decision

- **5 free questions per visitor per UTC day**, counted in Upstash Redis (`@upstash/redis`), keyed by a salted hash
  of the visitor's IP (never the raw IP). Retry and the Approve/Deny follow-up re-send the same message, so they are
  free, up to a daily cap of free repeats so one message id can't be reused forever.
- **A global daily budget** of live answers (default 300). After it, everyone gets the scripted demo answer
  ("busy-day"), so the demo never breaks and the key never runs away.
- **The server tells the UI**: each answer carries `{ quota, mode }` as message metadata, and `GET /api/quota` gives the
  count before the first question. Web and phone share the types and error wording in `@repo/ai/shared`
  (`AskMetadata`, `describeAskError`, `formatResetIn`).
- **A friendly limit card**, never a red error: how many were used, a countdown to the reset, and where to go next.
- **A side drawer on the phone** (`expo-router/drawer`, already inside expo-router: no new package) that wraps the
  native tabs and adds Security report, Scan history, Activity and About.
- The in-memory burst limiter stays as a cheap first guard.

## Alternatives rejected

- **Signed cookie only:** a private window resets it, and the phone has no cookie jar.
- **In-memory counters:** loose on Vercel and reset on every deploy; not safe with a real key.
- **Blocking everyone after the global budget:** looks broken; scripted answers keep the demo useful.
- **A menu bottom sheet instead of a drawer:** a drawer was what was asked for and fits a list of destinations.

## Consequences

- Needs a free Upstash database (Vercel Marketplace) and `QUOTA_SALT` in Vercel. Without Redis it counts in memory.
- IP-based limits are shared by people behind one network (an office, a phone carrier) and are not a security boundary.
  A real per-account limit arrives with auth (Day 26).
- If Redis is down the route serves the scripted answer (and logs), so the key stays protected.
- The phone's new screens use a small fixed dataset in `@repo/ai/shared` (`demo-report.ts`). The web dashboard still
  uses its own seeded data; merging the two is future work.
- Not verified: the Upstash `SET NX` path against a real database (tested with the in-memory store only), and the
  drawer on Android and on a real device.
