---
paths: ["supabase/**"]
---

# supabase/ rules (Postgres, RLS, Supabase CLI v3)

Why: many founders share one database, and their code findings are private. See ADR 0013. Hook rule 13 enforces points 1, 3, 4 and 5.

## Remember (Day 13)

1. **Every `public` table turns on RLS in the same migration** (`alter table public.x enable row level security`). A table without RLS is open to anyone with the public key.
2. **Tenant tables carry `org_id`.** A policy asks "is this row's `org_id` one of mine?" through the membership helper `private.user_org_ids()`. It does not walk the tables on every row.
3. **Security-definer helpers live in the `private` schema** and say `set search_path = ''`. Inside them, write every name with its schema (`public.org_members`). The `private` schema is not exposed by the API.
4. **`anon` gets nothing by default.** Never `grant ... to anon` by habit. If a public page really needs it, add a policy and a grant on purpose and explain it in the PR.
5. **Never edit an applied migration.** Create a new one: `pnpm exec supabase migration new <name>`. Only a file that is not on `main` yet may change.
6. **The server writes, clients read.** Browsers and the app only `select`. Writes go through server code with the service role, which never reaches the browser. Where a client may change something, grant **per column**, not per table.
7. **`text` + `check`, not enums.** A check constraint is easy to change in a new migration; an enum is not. The allowed values must match `@repo/ai/shared` (`SEVERITIES`, categories, statuses). `fixed` is set by the server only.
8. **No policies that join per row.** Use the indexed `org_id` column and the helper. A join inside a policy runs for every row and gets slow.
9. **Secrets never sit in a table a client can read.** Tokens go in Vault. The connections table keeps only a reference (an id), never the token.
10. **Every new table gets a pgTAP test with two orgs.** Org A must not see, change or delete org B's rows, and `anon` must see nothing. Run it before saying done. The CLI is pinned in the root `package.json`, runs against the **local** stack by default, and we never pass `--remote` or `--yes` (the hosted project starts on Day 14).

## Before saying "done"

Proof for a schema change = `pnpm db:reset` (no errors) **and** `pnpm db:test` (paste the output) **and** regenerated types (`pnpm db:types`) **and** `pnpm check-types`.
