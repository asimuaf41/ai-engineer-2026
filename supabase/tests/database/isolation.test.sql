-- Who-can-do-what matrix (owner, admin, plain member, outsider) and the guard rails of the connection functions.
-- Added after a security review of the first 29 tests. Run with: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- People: A owns Org One, C is an admin there, B is a plain member there. D owns Org Two (an outsider to Org One).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'd@example.test');
insert into public.orgs (id, name, slug, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org One', 'org-one-iso', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org Two', 'org-two-iso', '44444444-4444-4444-4444-444444444444');
insert into public.org_members (org_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member');
insert into public.apps (id, org_id, name, repo_full_name, default_branch)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'shop', 'acme/shop', 'main');
insert into public.audit_log (org_id, action) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'org.created');
insert into public.connections (org_id, provider, external_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'github_app', '123');

-- ----- C, an ADMIN of Org One -----
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

-- 1: an admin can rename the organization.
update public.orgs set name = 'Renamed' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select name from public.orgs where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'Renamed', 'an admin can rename the organization');
-- 2: but cannot change its address (slug): that column is not writable by a browser at all.
select throws_ok($$update public.orgs set slug = 'hijacked-slug-x' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '42501', null, 'an admin cannot change the slug');
-- 3: an admin can change an app.
update public.apps set default_branch = 'trunk' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select is((select default_branch from public.apps where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 'trunk', 'an admin can update an app');
-- 4: an admin of Org One cannot add an app to Org Two.
select throws_ok($$insert into public.apps (org_id, name, repo_full_name, default_branch) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'evil/x', 'main')$$, '42501', null, 'an admin cannot add an app to another organization');
-- 5: an admin can read the audit log.
select is((select count(*)::int from public.audit_log), 1, 'an admin can read the audit log');
-- 12: even an admin cannot remove the owner's membership: nobody writes org_members from the browser.
select throws_ok($$delete from public.org_members where user_id = '11111111-1111-1111-1111-111111111111'$$, '42501', null, 'an admin cannot remove the owner');

reset role;

-- ----- B, a plain MEMBER of Org One -----
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

-- 6: a member cannot rename the organization (the update simply matches no rows).
update public.orgs set name = 'Member was here' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select name from public.orgs where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'Renamed', 'a member cannot rename the organization');
-- 7: a member cannot delete an app.
delete from public.apps where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select is((select count(*)::int from public.apps where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 1, 'a member cannot delete an app');
-- 8: a member can see that the connections exist, 9: but not the audit log.
select is((select count(*)::int from public.connections), 1, 'a member can see the connections');
select is((select count(*)::int from public.audit_log), 0, 'a member cannot read the audit log');
-- 10: a member cannot promote themselves, 11: or add anyone.
select throws_ok($$update public.org_members set role = 'owner' where user_id = '22222222-2222-2222-2222-222222222222'$$, '42501', null, 'a member cannot promote themselves');
select throws_ok($$insert into public.org_members (org_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'owner')$$, '42501', null, 'a member cannot add members');

reset role;

-- ----- D, owner of Org Two -----
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
set local role authenticated;

-- 13: creating an organization and reading it back in the SAME statement is refused (the membership only exists after the
-- trigger runs). Our app inserts first and reads in a second query, and this test records why.
select throws_ok($$insert into public.orgs (name, slug, created_by) values ('Read back', 'read-back-test', '44444444-4444-4444-4444-444444444444') returning id$$, '42501', null, 'insert ... returning is refused; the app reads the org in a second query');

reset role;

-- ----- the database owner -----
-- 14-15: one app per repository per organization, but another organization may use the same repository name.
select throws_ok($$insert into public.apps (org_id, name, repo_full_name, default_branch) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'again', 'acme/shop', 'main')$$, '23505', null, 'the same repository twice in one organization is refused');
select lives_ok($$insert into public.apps (org_id, name, repo_full_name, default_branch) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'shop', 'acme/shop', 'main')$$, 'another organization may use the same repository name');

-- 16-17: the owner-adding trigger function and the private helpers cannot be reached by the wrong roles.
select ok(not has_function_privilege('authenticated', 'private.add_org_owner()', 'execute'), 'signed-in users cannot run the owner trigger function');
select ok(not has_schema_privilege('anon', 'private', 'usage') and not has_function_privilege('anon', 'private.user_org_ids()', 'execute'), 'visitors cannot reach the private helpers');

-- ----- the server -----
set local role service_role;
create temp table conn as select id from public.connections where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and provider = 'github_app';

-- 18: with the WRONG organization, revoking or changing a connection does nothing.
select is(
  server.revoke_connection('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select id from conn))::text || server.set_connection_status('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select id from conn), 'error')::text,
  'falsefalse',
  'the wrong organization cannot revoke or change a connection');

-- 19: an app of another organization cannot be linked.
select throws_ok($$select server.save_connection('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'github_app', '1', null, 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$, 'P0002', null, 'an app from another organization cannot be linked');

-- 20: a stored token cannot be left attached to a different external account.
select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supabase_oauth', 'org-a', '{"t":"x"}');
select throws_ok($$select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'supabase_oauth', 'org-b')$$, '22023', null, 'changing the external id without a new secret is refused');

-- 21: linking an app does not hide an 'error' status.
update public.connections set status = 'error' where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and provider = 'github_app';
select server.save_connection('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'github_app', '123', null, 'cccccccc-cccc-cccc-cccc-cccccccccccc');
select is(
  (select status || ':' || (app_id is not null)::text from public.connections where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and provider = 'github_app'),
  'error:true',
  'linking an app keeps an error status and sets the app');

reset role;

select * from finish();
rollback;
