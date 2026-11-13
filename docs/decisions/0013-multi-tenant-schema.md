# 0013 — Multi-tenant schema: shared tables, org_id and RLS

Date: 2026-11-13 · Status: Accepted

(The number is 0013, not 0012: `0012-ai-on-mobile.md` was already merged to main.)

## Context

Shipwright serves many founders from one database. What we store about them is private: their code, their findings,
and the proof of each problem. A leak between two customers would end the product. Sign-in is Supabase Auth, so every
request already carries a user id that a policy can check.

## Decision

- **Shared tables with an `org_id` column, protected by Row Level Security (RLS).** Every tenant table has `org_id`, and a
  policy lets a user see only rows whose `org_id` is one of their orgs.
- **A private helper schema.** The membership lookup (`user_org_ids()`) is a security-definer function in `private`, with
  `set search_path = ''`, so policies stay short and the function can't be called or tampered with through the API.
- **Grants per column.** `anon` gets nothing. Signed-in users get `select`, and `update` only on the few columns a client
  may change.
- **The server writes, clients read.** Writes run on the server with the service role. For example, `fixed` is set by the
  server only, and the database is the source of truth for status.
- **`text` + `check` instead of enums.** The allowed values match `@repo/ai/shared` and can be changed in a new migration.
- **pgTAP tests with two orgs** prove that org A can't see or change org B's data.
- **The CLI is pinned in the repo** (`supabase@3.1.0`), so CI and every Mac run the same version. CLI v3 works on the local
  stack by default, and hosted changes need an explicit `--remote`, which scripts must not use (hook rule 13).

## Alternatives rejected

- **A schema per tenant:** migrations must run once per customer, and the number of schemas grows without limit.
- **A database per tenant:** the strongest isolation, but cost and operations grow with every customer. Too heavy for v1.
- **Postgres enums:** adding or removing a value is awkward, and it drifts from the TypeScript types.
- **Policies that join tables per row:** slow, and hard to read and test. We use the indexed `org_id` and a helper.
- **Putting the token in the connections table:** a policy mistake would expose it. Tokens go in Vault, and the table keeps a reference.

## Consequences

- Every new table needs RLS in its own migration and a pgTAP test with two orgs. Hook rule 13 checks the first part; the
  test is on us.
- Applied migrations are never edited. A change is always a new migration (hook rule 13).
- Isolation depends on policies being right. One missing `org_id` check is a leak, so the tests are not optional.
- The hosted Supabase project is created on Day 14. Until then everything runs locally, and no command uses `--remote` or `--yes`.
- The web types in `@repo/ai/shared` and the check constraints must change together.
