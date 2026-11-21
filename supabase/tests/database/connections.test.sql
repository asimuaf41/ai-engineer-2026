-- Tests for the server-only connection functions and Vault. The questions: can a signed-in user reach them (no), does the
-- token stay out of normal tables (yes), and does each function stay inside the organization it was given (yes).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.test');
-- Two organizations (the owner trigger adds the member rows).
insert into public.orgs (id, name, slug, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', 'org-one-test', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', 'org-two-test', '11111111-1111-1111-1111-111111111111');

-- 1-2: nobody but the server can even enter the schema.
select ok(not has_schema_privilege('authenticated', 'server', 'usage'), 'signed-in users have no access to the server schema');
select ok(not has_schema_privilege('anon', 'server', 'usage'), 'visitors have no access to the server schema');

-- 3-5: nobody but the server can run the functions.
select ok(not has_function_privilege('authenticated', 'server.read_connection_secret(uuid, uuid)', 'execute'), 'signed-in users cannot run read_connection_secret');
select ok(not has_function_privilege('anon', 'server.read_connection_secret(uuid, uuid)', 'execute'), 'visitors cannot run read_connection_secret');
select ok(has_function_privilege('service_role', 'server.save_connection(uuid, text, text, text, uuid, uuid)', 'execute'), 'the server (service_role) can run save_connection');

-- 6: and trying anyway fails, even through a normal call.
set local role authenticated;
select throws_ok(
  $$select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'github_app', '123')$$,
  '42501', null, 'a signed-in user cannot save a connection');
reset role;

-- From here on we are the server.
set local role service_role;

-- 7: save a connection with a token, read the token back.
create temp table made (id uuid);
grant all on made to service_role;
insert into made select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supabase_oauth', 'org-slug-1', '{"access_token":"tok-SECRET-1"}');
select is(
  server.read_connection_secret('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select id from made)),
  '{"access_token":"tok-SECRET-1"}',
  'the saved token can be read back by the server');

-- 8: the same connection id with another organization's id gets nothing.
select is(
  server.read_connection_secret('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select id from made)),
  null,
  'another organization cannot read the token');

-- 9: saving again replaces the token in the SAME vault secret (refresh), and keeps one connection.
select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supabase_oauth', 'org-slug-1', '{"access_token":"tok-SECRET-2"}');
select is(
  (select count(*)::int from public.connections where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and provider = 'supabase_oauth')
  || '/' || (select count(*)::int from vault.secrets where name = 'connection:' || (select id from made)::text)
  || '/' || server.read_connection_secret('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select id from made)),
  '1/1/{"access_token":"tok-SECRET-2"}',
  'a refresh replaces the token in the same vault secret');

reset role;

-- 10: the token text is in NO ordinary table (only in Vault).
select is(
  (select coalesce(sum(((xpath('/row/c/text()',
      query_to_xml(format('select count(*) as c from %I.%I t where row_to_json(t)::text like %L', table_schema, table_name, '%tok-SECRET%'), false, true, '')))[1])::text::int), 0)::int
   from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'),
  0,
  'the token appears in no table of the public schema');

set local role service_role;

-- 11: disconnecting removes the vault secret and the connection.
select ok(server.revoke_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select id from made)), 'revoke_connection reports success');

-- 12: a made-up provider is refused by the table's own rule.
select throws_ok(
  $$select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'made_up_provider', 'x')$$,
  '23514', null, 'an unknown provider is refused');

reset role;

-- 13: every function in the server schema has a fixed search_path.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'server'
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) setting where setting like 'search_path=%')),
  0,
  'every server function has search_path set');

select * from finish();
rollback;
