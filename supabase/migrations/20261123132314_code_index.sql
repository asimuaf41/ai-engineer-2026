-- Shipwright Day 15: a searchable index of each connected repo.
--
-- Three tables, one per question:
--   code_indexes  "Which commit did we index, is it ready, what did it cost?"   members read
--   code_files    "Which files exist, what do they import/export, which env vars?" members read
--   code_chunks   "The actual code + its embedding."                             server ONLY
--
-- Members can see the code MAP (file names, symbols) in the dashboard, but the code
-- itself and the vectors are only readable by our server (secret key = service_role).
-- Search goes through server.search_code(...) after the API route checked the user
-- with requireOrg (Day 14 rule: authorize with the user client, act with the admin client).
--
-- Embeddings: voyage-code-4, 1024 dimensions. Changing model or size = a new index,
-- never a mix (the embedding_model column makes a mismatch visible).

create extension if not exists vector with schema extensions;

-- ───────────── Tables ─────────────

create table public.code_indexes (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs (id) on delete cascade,
  app_id           uuid not null references public.apps (id) on delete cascade,
  commit_sha       text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  status           text not null default 'queued'
                   check (status in ('queued', 'running', 'ready', 'failed')),
  embedding_model  text not null,
  dims             int not null check (dims in (256, 512, 1024, 2048)),
  files_count      int not null default 0,
  chunks_count     int not null default 0,
  reused_chunks    int not null default 0,            -- embeddings copied, not paid for
  embed_tokens     int not null default 0,
  cost_usd         numeric(10, 4) not null default 0,
  skipped          jsonb not null default '{}'::jsonb, -- {"too_big": 3, "binary": 12, ...}
  stack            jsonb not null default '{}'::jsonb, -- {"next": "16.4.3", "supabase": true, "stripe": true}
  error            text,
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index code_indexes_org_id_idx on public.code_indexes (org_id);
create index code_indexes_app_created_idx on public.code_indexes (app_id, created_at desc);

create table public.code_files (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  app_id      uuid not null references public.apps (id) on delete cascade,
  index_id    uuid not null references public.code_indexes (id) on delete cascade,
  path        text not null check (char_length(path) between 1 and 500 and path !~ '(^/|\.\./)'),
  language    text not null,                          -- ts, tsx, js, jsx, sql, json, md, other
  kind        text not null default 'other'
              check (kind in ('page', 'route', 'server_action', 'component', 'lib',
                              'migration', 'config', 'test', 'other')),
  size_bytes  int not null check (size_bytes >= 0),
  sha256      text not null,
  symbols     jsonb not null default '[]'::jsonb,       -- [{name, kind, exported, line}]
  imports     text[] not null default '{}',
  env_vars    text[] not null default '{}',             -- names only, never values
  is_client   boolean not null default false,           -- has 'use client'
  redactions  int not null default 0,                   -- secrets we masked before storing
  unique (index_id, path)
);
create index code_files_org_id_idx on public.code_files (org_id);
create index code_files_index_id_idx on public.code_files (index_id);

create table public.code_chunks (
  id            bigint generated always as identity primary key,
  org_id        uuid not null references public.orgs (id) on delete cascade,
  app_id        uuid not null references public.apps (id) on delete cascade,
  index_id      uuid not null references public.code_indexes (id) on delete cascade,
  file_id       uuid not null references public.code_files (id) on delete cascade,
  path          text not null,
  symbol        text,                                   -- null for line-window chunks
  start_line    int not null check (start_line > 0),
  end_line      int not null check (end_line >= start_line),
  content       text not null check (char_length(content) <= 12000),
  content_hash  text not null,                          -- sha256 of model + embedded text
  embedding     extensions.vector(1024),                -- null until embedded or reused
  -- Keyword index. Punctuation becomes spaces first, so "process.env.SUPABASE_URL" is
  -- searchable as words (Postgres would otherwise read it as one host-name token).
  fts           tsvector generated always as (
                  to_tsvector('simple', regexp_replace(
                    coalesce(symbol, '') || ' ' || path || ' ' || content, '[^[:alnum:]_]+', ' ', 'g'))
                ) stored
);
create index code_chunks_org_id_idx on public.code_chunks (org_id);
create index code_chunks_file_id_idx on public.code_chunks (file_id);
create index code_chunks_index_hash_idx on public.code_chunks (index_id, content_hash);
create index code_chunks_fts_idx on public.code_chunks using gin (fts);
-- No HNSW index on purpose (Day 15): search always filters to ONE index (one repo,
-- usually < 20k chunks). An exact scan of that is a few ms with 100% recall, while a
-- filtered HNSW scan can return fewer rows than asked. Add HNSW + iterative scans
-- (pgvector 0.8) when one app passes ~50k chunks.

-- ───────────── Grants + RLS ─────────────

revoke all on public.code_indexes, public.code_files, public.code_chunks from anon, authenticated;
grant select on public.code_indexes, public.code_files to authenticated;
-- code_chunks: no grant at all for anon/authenticated. Server only.

alter table public.code_indexes enable row level security;
alter table public.code_files   enable row level security;
alter table public.code_chunks  enable row level security;

create policy "members read code indexes" on public.code_indexes for select to authenticated
  using (org_id in (select private.user_org_ids()));
create policy "members read the code map" on public.code_files for select to authenticated
  using (org_id in (select private.user_org_ids()));
-- (no policy on code_chunks = nobody but service_role, which bypasses RLS)

-- ───────────── Server-only functions ─────────────
-- security INVOKER: they run as the caller, and only service_role may call them.
-- search_path is '' so every name is schema-qualified, including the pgvector
-- operator: OPERATOR(extensions.<=>). Without it you get "operator does not exist".

-- The newest READY index of an app, only if it belongs to that org.
create function server.latest_ready_index(p_org_id uuid, p_app_id uuid)
returns uuid
language sql stable set search_path = ''
as $$
  select i.id from public.code_indexes i
  where i.org_id = p_org_id and i.app_id = p_app_id and i.status = 'ready'
  order by i.finished_at desc nulls last, i.created_at desc
  limit 1
$$;

-- Which of these chunk hashes are already embedded in the latest ready index?
-- The indexer embeds only the others: unchanged code costs $0 on re-index.
create function server.known_chunk_hashes(p_org_id uuid, p_app_id uuid, p_hashes text[])
returns setof text
language sql stable set search_path = ''
as $$
  select distinct c.content_hash
  from public.code_chunks c
  where c.index_id = server.latest_ready_index(p_org_id, p_app_id)
    and c.org_id = p_org_id
    and c.embedding is not null
    and c.content_hash = any (p_hashes)
$$;

-- Copy embeddings for unchanged chunks from the previous ready index into the new one.
-- Returns how many rows were filled.
create function server.reuse_embeddings(p_org_id uuid, p_app_id uuid, p_new_index_id uuid)
returns int
language plpgsql set search_path = ''
as $$
declare
  v_prev uuid := server.latest_ready_index(p_org_id, p_app_id);
  v_count int;
begin
  if v_prev is null or v_prev = p_new_index_id then
    return 0;
  end if;
  if not exists (select 1 from public.code_indexes
                 where id = p_new_index_id and org_id = p_org_id and app_id = p_app_id) then
    raise exception 'index % does not belong to this org/app', p_new_index_id;
  end if;

  update public.code_chunks n
  set embedding = o.embedding
  from (select distinct on (content_hash) content_hash, embedding
        from public.code_chunks
        where index_id = v_prev and embedding is not null) o
  where n.index_id = p_new_index_id
    and n.embedding is null
    and n.content_hash = o.content_hash;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Mark an index ready and delete older ones (keep the newest p_keep ready indexes).
create function server.finish_code_index(p_org_id uuid, p_index_id uuid, p_keep int default 2)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_app uuid;
begin
  update public.code_indexes
  set status = 'ready', finished_at = now(),
      chunks_count = (select count(*) from public.code_chunks where index_id = p_index_id),
      files_count  = (select count(*) from public.code_files  where index_id = p_index_id)
  where id = p_index_id and org_id = p_org_id
  returning app_id into v_app;

  if v_app is null then
    raise exception 'index % not found for this org', p_index_id;
  end if;
  if exists (select 1 from public.code_chunks where index_id = p_index_id and embedding is null) then
    raise exception 'index % still has chunks without embeddings', p_index_id;
  end if;

  delete from public.code_indexes
  where app_id = v_app and org_id = p_org_id and id <> p_index_id
    and ((status in ('failed', 'queued', 'running') and created_at < now() - interval '1 day')
         or (status = 'ready' and id not in (
              select id from public.code_indexes
              where app_id = v_app and status = 'ready'
              order by finished_at desc nulls last limit greatest(p_keep, 1))));
end;
$$;

-- Hybrid search: keyword (full text) + meaning (vector), merged with Reciprocal Rank
-- Fusion. Code needs both: "SUPABASE_SERVICE_ROLE_KEY" is an exact word, "where do we
-- check if the user paid?" is a meaning. Pass p_query_embedding null for keyword only.
create function server.search_code(
  p_org_id          uuid,
  p_app_id          uuid,
  p_query_text      text,
  p_query_embedding extensions.vector(1024) default null,
  p_match_count     int default 8,
  p_rrf_k           int default 50
)
returns table (
  chunk_id    bigint,
  path        text,
  symbol      text,
  start_line  int,
  end_line    int,
  content     text,
  score       double precision,
  matched_by  text
)
language sql stable set search_path = ''
as $$
  with idx as (
    select server.latest_ready_index(p_org_id, p_app_id) as id
  ),
  keyword as (
    select c.id,
           row_number() over (order by ts_rank_cd(c.fts, q.query) desc, c.id) as rank_ix
    from public.code_chunks c, idx,
         lateral (select websearch_to_tsquery('simple',
                   regexp_replace(p_query_text, '[^[:alnum:]_"-]+', ' ', 'g')) as query) q
    where c.index_id = idx.id and c.org_id = p_org_id
      and coalesce(p_query_text, '') <> '' and c.fts @@ q.query
    order by rank_ix
    limit least(p_match_count, 30) * 2
  ),
  semantic as (
    select c.id,
           row_number() over (
             order by c.embedding operator(extensions.<=>) p_query_embedding, c.id
           ) as rank_ix
    from public.code_chunks c, idx
    where c.index_id = idx.id and c.org_id = p_org_id
      and p_query_embedding is not null and c.embedding is not null
    order by rank_ix
    limit least(p_match_count, 30) * 2
  )
  select c.id, c.path, c.symbol, c.start_line, c.end_line, c.content,
         coalesce(1.0 / (p_rrf_k + k.rank_ix), 0.0)
           + coalesce(1.0 / (p_rrf_k + s.rank_ix), 0.0) as score,
         case when k.id is not null and s.id is not null then 'both'
              when k.id is not null then 'keyword' else 'meaning' end as matched_by
  from keyword k
  full outer join semantic s on s.id = k.id
  join public.code_chunks c on c.id = coalesce(k.id, s.id)
  order by score desc, c.id
  limit least(p_match_count, 30)
$$;

revoke all on all functions in schema server from public, anon, authenticated;
grant execute on all functions in schema server to service_role;
