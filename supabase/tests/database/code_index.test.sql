-- supabase/tests/database/code_index.test.sql
-- Proves: members see the code MAP of their own org only, nobody but the server reads
-- code or vectors, search never crosses orgs, and re-indexing reuses embeddings.
begin;
select plan(19);

-- A 1024-dim test vector with a 1 at position n (two different n = far apart).
create function pg_temp.onehot(n int) returns extensions.vector
language sql immutable as $$
  select (select array_agg(case when i = n then 1.0 else 0.0 end order by i)
          from generate_series(1, 1024) i)::real[]::extensions.vector(1024)
$$;

-- service_role calls the helper later, so it needs execute on it.
grant execute on function pg_temp.onehot(int) to public;

-- Arrange (as postgres)
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@acme.test'),
  ('22222222-2222-2222-2222-222222222222', 'bo@globex.test');
insert into public.orgs (id, name, slug, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Acme', 'acme', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Globex', 'globex', '22222222-2222-2222-2222-222222222222');
insert into public.apps (id, org_id, name, repo_full_name, default_branch) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Acme CRM', 'acme/crm', 'main'),
  ('b0000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Globex Shop', 'globex/shop', 'main');

insert into public.code_indexes (id, org_id, app_id, commit_sha, status, embedding_model, dims, finished_at) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   repeat('a', 40), 'ready', 'voyage-code-4', 1024, now() - interval '1 hour'),
  ('c2000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   repeat('b', 40), 'ready', 'voyage-code-4', 1024, now() - interval '1 hour');

insert into public.code_files (id, org_id, app_id, index_id, path, language, kind, size_bytes, sha256, env_vars) values
  ('f1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 'src/lib/supabase.ts', 'ts', 'lib', 210, 'h1', '{SUPABASE_SERVICE_ROLE_KEY}'),
  ('f1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 'src/app/api/checkout/route.ts', 'ts', 'route', 400, 'h2', '{}'),
  ('f2000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'c2000000-0000-0000-0000-000000000002', 'src/lib/supabase.ts', 'ts', 'lib', 200, 'h3', '{SUPABASE_SERVICE_ROLE_KEY}');

insert into public.code_chunks (org_id, app_id, index_id, file_id, path, symbol, start_line, end_line, content, content_hash, embedding) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000001', 'src/lib/supabase.ts', 'supabase', 1, 5,
   'export const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)', 'hash-acme-1', pg_temp.onehot(1)),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000002', 'src/app/api/checkout/route.ts', 'POST', 1, 20,
   'export async function POST(req: Request) { const session = await stripe.checkout.sessions.create(...) }',
   'hash-acme-2', pg_temp.onehot(2)),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002',
   'f2000000-0000-0000-0000-000000000001', 'src/lib/supabase.ts', 'supabase', 1, 5,
   'export const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!) // globex', 'hash-globex-1', pg_temp.onehot(1));

-- 1: RLS is on for all three tables
select is((select count(*)::int from pg_class
           where relname in ('code_indexes', 'code_files', 'code_chunks') and relrowsecurity), 3,
  'RLS is enabled on all code index tables');

-- Act as Ana (Acme owner) from the browser
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq('select path from public.code_files order by path',
  $$values ('src/app/api/checkout/route.ts'), ('src/lib/supabase.ts')$$,
  'Ana sees the code map of Acme only');
select is_empty($$select 1 from public.code_indexes where org_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
  'Ana cannot see Globex indexes, even by id');
select throws_ok('select content from public.code_chunks', '42501', null,
  'the browser cannot read code chunks');
select throws_ok('select embedding from public.code_chunks', '42501', null,
  'the browser cannot read embeddings');
select throws_ok($$update public.code_indexes set status = 'failed'$$, '42501', null,
  'members cannot change index status');
select throws_ok($$insert into public.code_files (org_id, app_id, index_id, path, language, size_bytes, sha256)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
          'c1000000-0000-0000-0000-000000000001', 'x.ts', 'ts', 1, 'x')$$, '42501', null,
  'members cannot write the code map');
select throws_ok($$select * from server.search_code('aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', 'supabase')$$, '42501', null,
  'a signed-in user cannot call server.search_code');

-- Anonymous visitor
reset role;
set local role anon;
select throws_ok('select path from public.code_files', '42501', null, 'anon cannot read the code map');

-- Act as the server
reset role;
set local role service_role;

select results_eq($$select path from server.search_code('aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', 'SUPABASE_SERVICE_ROLE_KEY')$$,
  $$values ('src/lib/supabase.ts')$$,
  'keyword search finds an exact env var name, Acme only');
select is_empty($$select 1 from server.search_code('bbbbbbbb-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001', 'supabase', pg_temp.onehot(1))$$,
  'wrong org for the app returns nothing');
select is((select path from server.search_code('aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', '', pg_temp.onehot(2)) limit 1),
  'src/app/api/checkout/route.ts', 'meaning search ranks the nearest chunk first');
select is((select matched_by from server.search_code('aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', 'createClient', pg_temp.onehot(1)) limit 1),
  'both', 'a chunk found by keyword AND meaning ranks first');

-- Re-index: a new commit with one unchanged chunk and one new chunk
insert into public.code_indexes (id, org_id, app_id, commit_sha, status, embedding_model, dims) values
  ('c1000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   repeat('c', 40), 'running', 'voyage-code-4', 1024);
insert into public.code_files (id, org_id, app_id, index_id, path, language, size_bytes, sha256) values
  ('f1000000-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000009', 'src/lib/supabase.ts', 'ts', 210, 'h1');
insert into public.code_chunks (org_id, app_id, index_id, file_id, path, start_line, end_line, content, content_hash, embedding) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000009',
   'f1000000-0000-0000-0000-000000000009', 'src/lib/supabase.ts', 1, 5, 'same code', 'hash-acme-1', null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000009',
   'f1000000-0000-0000-0000-000000000009', 'src/lib/supabase.ts', 6, 9, 'new code', 'hash-acme-new', pg_temp.onehot(3));

select results_eq($$select * from server.known_chunk_hashes('aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', array['hash-acme-1', 'hash-acme-new', 'hash-globex-1'])$$,
  $$values ('hash-acme-1')$$,
  'only unchanged Acme chunks count as known (never Globex hashes)');
select is(server.reuse_embeddings('aaaaaaaa-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000009'), 1,
  'the unchanged chunk got its embedding copied for free');

select server.finish_code_index('aaaaaaaa-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000009', 1);
select results_eq($$select id from public.code_indexes where app_id = 'a0000000-0000-0000-0000-000000000001'$$,
  $$values ('c1000000-0000-0000-0000-000000000009'::uuid)$$,
  'finishing keeps only the newest ready index (keep = 1)');

-- Disconnecting GitHub deletes the workspace's apps (see disconnectAction): the whole code index must go with them.
reset role;
select lives_ok($$delete from public.apps where id = 'a0000000-0000-0000-0000-000000000001'$$, 'an app can be deleted');
select is((select count(*) from public.code_indexes where app_id = 'a0000000-0000-0000-0000-000000000001'), 0::bigint,
  'deleting the app deletes its indexes');
select is((select count(*) from public.code_chunks where app_id = 'a0000000-0000-0000-0000-000000000001')
        + (select count(*) from public.code_files where app_id = 'a0000000-0000-0000-0000-000000000001'), 0::bigint,
  'deleting the app deletes its files, code chunks and vectors');

select * from finish();
rollback;
