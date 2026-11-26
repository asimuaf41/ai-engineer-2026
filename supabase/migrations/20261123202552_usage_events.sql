-- Shipwright Day 15: what we spent for each workspace, and a guard so an app has one index run at a time.
--
-- usage_events: one row per paid thing (today only AI tokens for code indexing). Members can READ their own org's usage;
-- only our server writes it (secret key = service_role), like audit_log.
--
-- code_indexes_one_active_idx: at most ONE index per app may be queued or running. A second "Index my code" click then
-- fails inside the database (unique violation 23505) instead of racing a check in app code.

create table public.usage_events (
  id         bigint generated always as identity primary key,
  org_id     uuid not null references public.orgs (id) on delete cascade,
  app_id     uuid references public.apps (id) on delete set null,
  kind       text not null check (kind in ('ai_tokens')),
  quantity   numeric not null check (quantity >= 0),            -- tokens, for 'ai_tokens'
  cost_usd   numeric(10, 4) not null default 0 check (cost_usd >= 0),
  meta       jsonb not null default '{}'::jsonb,                -- {"purpose": "code_index", "indexId": "..."}; ids only
  created_at timestamptz not null default now()
);
create index usage_events_org_created_idx on public.usage_events (org_id, created_at desc);

revoke all on public.usage_events from anon, authenticated;
grant select on public.usage_events to authenticated;

alter table public.usage_events enable row level security;

create policy "members read their usage" on public.usage_events for select to authenticated
  using (org_id in (select private.user_org_ids()));
-- (no insert/update/delete policy and no grant: only service_role, which bypasses RLS, writes)

-- Runs that were left over from before this rule can't still be going: close them, so the index below can be created.
update public.code_indexes set status = 'failed', error = 'Interrupted', finished_at = now() where status in ('queued', 'running');

create unique index code_indexes_one_active_idx on public.code_indexes (app_id)
  where status in ('queued', 'running');
