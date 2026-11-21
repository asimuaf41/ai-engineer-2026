-- Core multi-tenant schema (see docs/decisions/0013-multi-tenant-schema.md).
--
-- Many organizations share these tables. Every row that belongs to an organization carries org_id, and Row Level Security
-- (RLS) lets a signed-in user see only rows of organizations they belong to. Rules this file follows:
--   * every public table turns RLS on in this same file;
--   * `anon` (not signed in) gets nothing;
--   * signed-in users get column-level grants: only what a browser may legitimately read or change;
--   * the server writes the rest (audit log, connections) with the service role;
--   * helper functions that must bypass RLS live in the `private` schema, which the API does not expose,
--     and they set search_path = '' so they cannot be tricked into using another schema's objects;
--   * text + check constraints instead of enums, so a value can be changed with a new migration.

-- ---------------------------------------------------------------------------------------------------------------------
-- The private schema: helpers that are not reachable through the API.
-- ---------------------------------------------------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
-- Row-level-security policies run as the signed-in user, so that role needs to be able to call the helpers below.
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------------------------

-- An organization (a "workspace").
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.orgs enable row level security;

-- Who belongs to which organization, and as what. The trigger below adds the creator as the owner.
create table public.org_members (
  org_id uuid not null references public.orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_id_idx on public.org_members (user_id);
alter table public.org_members enable row level security;

-- One app (a GitHub repository, and optionally the Supabase project behind it) per row.
create table public.apps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  repo_full_name text not null check (repo_full_name ~ '^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'),
  default_branch text not null check (char_length(default_branch) between 1 and 255),
  supabase_project_ref text check (supabase_project_ref ~ '^[a-z]{20}$'),
  created_at timestamptz not null default now(),
  unique (org_id, repo_full_name)
);
create index apps_org_id_idx on public.apps (org_id);
alter table public.apps enable row level security;

-- A link to an outside service (GitHub App installation, Supabase account). The TOKEN is not here: it lives in Supabase
-- Vault, and this table keeps only vault_secret_id, a reference that browsers are not even allowed to select.
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  app_id uuid references public.apps (id) on delete set null,
  provider text not null check (provider in ('github_app', 'supabase_oauth')),
  external_id text not null check (char_length(external_id) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'error')),
  vault_secret_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One connection per organization and provider.
  unique (org_id, provider)
);
create index connections_app_id_idx on public.connections (app_id);
alter table public.connections enable row level security;

-- What happened and who did it. Written by the server only.
create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.orgs (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_.]{1,63}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_created_idx on public.audit_log (org_id, created_at desc);
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------------------------------------------------
-- Helpers (private schema)
-- ---------------------------------------------------------------------------------------------------------------------

-- The organizations the signed-in user belongs to. SECURITY DEFINER lets it read org_members without being blocked by that
-- table's own policy (which would otherwise ask this function again, forever).
create function private.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.org_members m where m.user_id = (select auth.uid());
$$;

-- The organizations where the signed-in user is an owner or an admin.
create function private.admin_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.org_members m where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin');
$$;

-- When an organization is created, its creator becomes its owner. This runs as the table owner, so the creator does not
-- (and must not) have permission to write org_members themselves.
create function private.add_org_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_members (org_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger orgs_add_owner
  after insert on public.orgs
  for each row execute function private.add_org_owner();

-- By default every function can be run by everyone. Close that, then open only what is needed.
revoke all on function private.user_org_ids(), private.admin_org_ids(), private.add_org_owner() from public, anon, authenticated;
-- Policies need the two lookups. The trigger function is run by the trigger itself, so nobody needs permission to call it.
grant execute on function private.user_org_ids(), private.admin_org_ids() to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Policies (who may see or change which rows)
-- ---------------------------------------------------------------------------------------------------------------------

-- orgs: members read their organizations. Anyone signed in can create one, but only as themselves.
-- Admins can rename it. Deleting is not allowed from the browser.
create policy orgs_select on public.orgs for select to authenticated
  using (id in (select private.user_org_ids()));
create policy orgs_insert on public.orgs for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy orgs_update on public.orgs for update to authenticated
  using (id in (select private.admin_org_ids()))
  with check (id in (select private.admin_org_ids()));

-- org_members: members see who is in their organizations. Nobody writes from the browser.
create policy org_members_select on public.org_members for select to authenticated
  using (org_id in (select private.user_org_ids()));

-- apps: members read; owners and admins create, change and remove.
create policy apps_select on public.apps for select to authenticated
  using (org_id in (select private.user_org_ids()));
create policy apps_insert on public.apps for insert to authenticated
  with check (org_id in (select private.admin_org_ids()));
create policy apps_update on public.apps for update to authenticated
  using (org_id in (select private.admin_org_ids()))
  with check (org_id in (select private.admin_org_ids()));
create policy apps_delete on public.apps for delete to authenticated
  using (org_id in (select private.admin_org_ids()));

-- connections: members read (never the vault reference, see the grants). Nobody writes from the browser.
create policy connections_select on public.connections for select to authenticated
  using (org_id in (select private.user_org_ids()));

-- audit_log: only owners and admins read it. Nobody writes from the browser.
create policy audit_log_select on public.audit_log for select to authenticated
  using (org_id in (select private.admin_org_ids()));

-- ---------------------------------------------------------------------------------------------------------------------
-- Grants (what each role may do at all, before RLS looks at rows)
-- ---------------------------------------------------------------------------------------------------------------------

-- New tables are reachable by the API roles by default. Take that away, for these tables and for future ones.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
-- A new function is runnable by everyone unless told otherwise. From now on a function must be opened on purpose.
alter default privileges revoke execute on functions from public;

-- Signed-in users get only these columns and actions. (service_role, used by our server, keeps full access.)
grant select on public.orgs to authenticated;
grant insert (name, slug, created_by) on public.orgs to authenticated;
grant update (name) on public.orgs to authenticated;

grant select on public.org_members to authenticated;

grant select on public.apps to authenticated;
grant insert (org_id, name, repo_full_name, default_branch, supabase_project_ref) on public.apps to authenticated;
grant update (name, repo_full_name, default_branch, supabase_project_ref) on public.apps to authenticated;
grant delete on public.apps to authenticated;

-- Every column EXCEPT vault_secret_id.
grant select (id, org_id, app_id, provider, external_id, status, created_at, updated_at) on public.connections to authenticated;

grant select on public.audit_log to authenticated;
