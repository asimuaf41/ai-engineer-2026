-- Row Level Security tests for the core schema. Two organizations' worth of people, and the question each test asks is
-- "can this person see or change something that is not theirs?". Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Two people. A will create an organization; B is an outsider (until test 14).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test');

-- 1-5: RLS is switched on for every table.
select ok((select relrowsecurity from pg_class where oid = 'public.orgs'::regclass), 'RLS is on for orgs');
select ok((select relrowsecurity from pg_class where oid = 'public.org_members'::regclass), 'RLS is on for org_members');
select ok((select relrowsecurity from pg_class where oid = 'public.apps'::regclass), 'RLS is on for apps');
select ok((select relrowsecurity from pg_class where oid = 'public.connections'::regclass), 'RLS is on for connections');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), 'RLS is on for audit_log');

-- 6: someone who is not signed in gets nothing at all.
set local role anon;
select throws_ok($$select * from public.orgs$$, '42501', null, 'anon cannot read orgs');
reset role;

-- ----- Person A (signed in) -----
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

-- 7: A can create an organization (as themselves).
select lives_ok(
  $$insert into public.orgs (name, slug, created_by) values ('Acme Labs', 'acme-labs-test', '11111111-1111-1111-1111-111111111111')$$,
  'A can create an organization');

-- 8: the trigger made A the owner, without A having any right to write org_members.
select results_eq(
  $$select role from public.org_members where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('owner'::text)$$,
  'the creator became the owner');

-- 9: A can see their own organization.
select is((select count(*)::int from public.orgs where slug = 'acme-labs-test'), 1, 'A can read their own organization');

-- 13: an owner can add an app.
select lives_ok(
  $$insert into public.apps (org_id, name, repo_full_name, default_branch)
    values ((select id from public.orgs where slug = 'acme-labs-test'), 'shop', 'acme-labs/shop', 'main')$$,
  'an owner can add an app');

-- 15: the vault reference is not readable by a browser, even for the owner of the connection.
select throws_ok($$select vault_secret_id from public.connections$$, '42501', null, 'vault_secret_id cannot be selected by a signed-in user');

-- 16: the audit log cannot be written from the browser.
select throws_ok(
  $$insert into public.audit_log (org_id, action) values ((select id from public.orgs where slug = 'acme-labs-test'), 'org.created')$$,
  '42501', null, 'the audit log cannot be written by a signed-in user');

reset role;

-- ----- Person B (signed in, NOT a member of A's organization) -----
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

-- 10: B cannot see A's organization.
select is((select count(*)::int from public.orgs where slug = 'acme-labs-test'), 0, 'B cannot see A''s organization');

-- 11: B cannot create an organization in A's name (a forged created_by).
select throws_ok(
  $$insert into public.orgs (name, slug, created_by) values ('Evil', 'evil-org-test', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'B cannot create an organization as someone else');

-- 12: B cannot see who is in A's organization.
select is((select count(*)::int from public.org_members), 0, 'B cannot see A''s members');

reset role;

-- Now B joins A's organization as a plain member (done by the database owner; members are not added from the browser yet).
insert into public.org_members (org_id, user_id, role)
  values ((select id from public.orgs where slug = 'acme-labs-test'), '22222222-2222-2222-2222-222222222222', 'member');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

-- 14: a plain member can read the apps but not add one.
select throws_ok(
  $$insert into public.apps (org_id, name, repo_full_name, default_branch)
    values ((select id from public.orgs where slug = 'acme-labs-test'), 'blog', 'acme-labs/blog', 'main')$$,
  '42501', null, 'a plain member cannot add an app');

reset role;

select * from finish();
rollback;
