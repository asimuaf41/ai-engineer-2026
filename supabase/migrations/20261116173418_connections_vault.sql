-- Connection tokens live in Supabase Vault (encrypted), behind functions that only our SERVER can run.
--
-- Why a separate "server" schema: the API exposes it (so our server can call these functions with the secret key), but signed-in
-- users and visitors have no access to it at all: no usage of the schema and no execute on any function (see the revokes at the
-- bottom). The token never sits in a normal table: public.connections keeps only vault_secret_id, a reference.
--
-- Each function takes the organization id too, and only acts on a connection that belongs to that organization. A connection
-- id on its own is never enough, so a mix-up in the app can't read or change another organization's connection.

create schema if not exists server;
revoke all on schema server from public, anon, authenticated;
grant usage on schema server to service_role;

-- Creates or updates the one connection of this organization and provider. With p_secret, it also stores (or replaces) the
-- token in Vault, keeping the same secret id, so a refreshed token overwrites the old one. Returns the connection id.
create function server.save_connection(
  p_org_id uuid,
  p_provider text,
  p_external_id text,
  p_secret text default null,
  p_app_id uuid default null,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_secret_id uuid;
  v_external_id text;
begin
  if not exists (select 1 from public.orgs o where o.id = p_org_id) then
    raise exception 'unknown organization' using errcode = 'P0002';
  end if;
  if p_app_id is not null and not exists (select 1 from public.apps a where a.id = p_app_id and a.org_id = p_org_id) then
    raise exception 'that app does not belong to this organization' using errcode = 'P0002';
  end if;

  -- Two saves for the same organization and provider at the same moment take turns (the lock is released at the end of
  -- the transaction), so the second one finds the first one's row instead of failing on the unique rule.
  perform pg_advisory_xact_lock(hashtextextended(p_org_id::text || ':' || p_provider, 0));

  select c.id, c.vault_secret_id, c.external_id into v_id, v_secret_id, v_external_id
    from public.connections c
    where c.org_id = p_org_id and c.provider = p_provider
    for update;

  if v_id is null then
    insert into public.connections (org_id, provider, external_id, status, app_id, created_by)
      values (p_org_id, p_provider, p_external_id, 'active', p_app_id, p_actor_id)
      returning id into v_id;
  else
    -- A stored token belongs to ONE external account. Pointing the connection at another one without a new token would
    -- leave the old account's token attached to it.
    if v_secret_id is not null and p_external_id is distinct from v_external_id and p_secret is null then
      raise exception 'a new secret is required when the external id changes' using errcode = '22023';
    end if;

    update public.connections
      set external_id = p_external_id,
          -- Only a NEW token makes a connection healthy again. Linking an app must not hide an 'error' status.
          status = case when p_secret is not null then 'active' else status end,
          -- A different external account must not keep the old app link (its repo or project belongs to the old account).
          app_id = case when p_external_id is distinct from v_external_id then p_app_id else coalesce(p_app_id, app_id) end,
          updated_at = now()
      where id = v_id;
  end if;

  if p_secret is not null then
    if v_secret_id is null then
      v_secret_id := vault.create_secret(p_secret, 'connection:' || v_id::text, p_provider);
      update public.connections set vault_secret_id = v_secret_id where id = v_id;
    else
      perform vault.update_secret(v_secret_id, p_secret);
    end if;
  end if;

  return v_id;
end;
$$;

-- Returns the decrypted token of a connection, or null when there is none (or the connection is another organization's).
create function server.read_connection_secret(p_org_id uuid, p_connection_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret
    from public.connections c
    join vault.decrypted_secrets s on s.id = c.vault_secret_id
    where c.id = p_connection_id and c.org_id = p_org_id;
$$;

-- Disconnects: deletes the token from Vault and the connection row. Returns false when nothing matched.
create function server.revoke_connection(p_org_id uuid, p_connection_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  select c.vault_secret_id into v_secret_id
    from public.connections c
    where c.id = p_connection_id and c.org_id = p_org_id
    for update;
  if not found then
    return false;
  end if;

  delete from public.connections where id = p_connection_id and org_id = p_org_id;
  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;
  return true;
end;
$$;

-- Marks a connection 'active' or 'error' (for example when a token can no longer be refreshed). Returns false when nothing matched.
create function server.set_connection_status(p_org_id uuid, p_connection_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.connections
    set status = p_status, updated_at = now()
    where id = p_connection_id and org_id = p_org_id;
  return found;
end;
$$;

-- Functions can be run by everyone by default. Close that for everyone, then open it to our server (service_role) only.
revoke all on all functions in schema server from public, anon, authenticated;
grant execute on all functions in schema server to service_role;
