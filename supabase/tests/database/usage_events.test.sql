-- supabase/tests/database/usage_events.test.sql
-- Proves: members read only their own org's usage, nobody but the server writes it, anon sees nothing, and an app
-- can have only one queued/running index at a time.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@acme.test'),
  ('22222222-2222-2222-2222-222222222222', 'bo@globex.test');
insert into public.orgs (id, name, slug, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Acme', 'acme-usage', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Globex', 'globex-usage', '22222222-2222-2222-2222-222222222222');
insert into public.apps (id, org_id, name, repo_full_name, default_branch) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Acme CRM', 'acme/crm', 'main'),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Acme Shop', 'acme/shop', 'main');

insert into public.usage_events (org_id, app_id, kind, quantity, cost_usd, meta) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ai_tokens', 1200, 0.0001, '{"purpose":"code_index"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', null, 'ai_tokens', 999, 0.0001, '{"purpose":"code_index"}');

select is((select count(*)::int from pg_class where relname = 'usage_events' and relrowsecurity), 1, 'RLS is enabled on usage_events');

-- Ana (Acme) from the browser
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq('select quantity::int from public.usage_events', $$values (1200)$$, 'Ana sees only Acme usage');
select is_empty($$select 1 from public.usage_events where org_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
  'Ana cannot see Globex usage, even by id');
select throws_ok($$insert into public.usage_events (org_id, kind, quantity) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ai_tokens', 1)$$,
  '42501', null, 'members cannot write usage');
select throws_ok($$update public.usage_events set quantity = 0$$, '42501', null, 'members cannot change usage');
select throws_ok($$delete from public.usage_events$$, '42501', null, 'members cannot delete usage');

-- Anonymous visitor
reset role;
set local role anon;
select throws_ok('select 1 from public.usage_events', '42501', null, 'anon cannot read usage');

-- The server can write, and the table refuses bad kinds
reset role;
set local role service_role;
select lives_ok($$insert into public.usage_events (org_id, kind, quantity, cost_usd) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ai_tokens', 5, 0)$$,
  'the server can write usage');
select throws_ok($$insert into public.usage_events (org_id, kind, quantity) values ('aaaaaaaa-0000-0000-0000-000000000001', 'free_lunch', 1)$$,
  '23514', null, 'an unknown kind is refused by the check constraint');

-- One active index per app
reset role;
insert into public.code_indexes (org_id, app_id, commit_sha, status, embedding_model, dims) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', repeat('a', 40), 'running', 'voyage-code-4', 1024);

select throws_ok($$insert into public.code_indexes (org_id, app_id, commit_sha, status, embedding_model, dims) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', repeat('b', 40), 'queued', 'voyage-code-4', 1024)$$,
  '23505', null, 'a second queued/running index for the same app is refused');
select lives_ok($$insert into public.code_indexes (org_id, app_id, commit_sha, status, embedding_model, dims) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', repeat('b', 40), 'running', 'voyage-code-4', 1024),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', repeat('c', 40), 'ready', 'voyage-code-4', 1024),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', repeat('d', 40), 'failed', 'voyage-code-4', 1024)$$,
  'another app, or ready/failed indexes of the same app, are fine');

select * from finish();
rollback;
