-- Registration-free cashbooks. Apply this migration for the private-link app.
-- Self-contained: the earlier anonymous-session migration is NOT required.
-- Existing legacy tables/data are retained but public client access is revoked.
begin;

create table if not exists public.pc_books (
  id uuid primary key default gen_random_uuid(),
  owner_hash bytea not null unique,
  viewer_hash bytea not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (owner_hash <> viewer_hash)
);
create table if not exists public.pc_entries (
  id uuid primary key,
  book_id uuid not null references public.pc_books(id) on delete cascade,
  date date not null,
  description text not null check (length(trim(description)) between 1 and 1000),
  category text not null check (length(trim(category)) between 1 and 200),
  amount numeric(10,2) not null check (amount > 0 and amount <= 99999999.99),
  type text not null check (type in ('income', 'expense')),
  notes text check (length(notes) <= 10000),
  created_at timestamptz not null default now()
);
create index if not exists pc_entries_book_date on public.pc_entries(book_id, date desc, created_at desc);
alter table public.pc_books enable row level security;
alter table public.pc_entries enable row level security;
revoke all on public.pc_books, public.pc_entries from public, anon, authenticated;

-- No direct table API access, even if an old permissive policy exists.
do $$ begin
  if to_regclass('public.transactions') is not null then
    revoke all on public.transactions from public, anon, authenticated;
  end if;
  if to_regclass('public.settings') is not null then
    revoke all on public.settings from public, anon, authenticated;
  end if;
end $$;

-- SHA-256 is built into PostgreSQL: no extension or Auth provider needed.
create or replace function public.pc_authorize(p_token text, p_write boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare b public.pc_books; h bytea;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid access link' using errcode = '42501';
  end if;
  h := sha256(convert_to(p_token, 'UTF8'));
  select * into b from public.pc_books where owner_hash = h or viewer_hash = h;
  if not found then raise exception 'This access link is invalid or has been replaced' using errcode = '42501'; end if;
  if p_write and b.owner_hash <> h then
    raise exception 'This link is view-only. Only the owner can make changes.' using errcode = '42501';
  end if;
  return b.id;
end $$;
revoke all on function public.pc_authorize(text, boolean) from public, anon, authenticated;

create or replace function public.pc_open(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare bid uuid; result jsonb;
begin
  bid := public.pc_authorize(p_token);
  select jsonb_build_object(
    'id', b.id,
    'role', case when b.owner_hash = sha256(convert_to(p_token, 'UTF8')) then 'owner' else 'viewer' end,
    'viewer_key_hash', case when b.owner_hash = sha256(convert_to(p_token, 'UTF8')) then encode(b.viewer_hash, 'hex') else null end,
    'settings', b.settings,
    'transactions', coalesce((select jsonb_agg(to_jsonb(e) - 'book_id' order by e.date desc, e.created_at desc, e.id)
      from public.pc_entries e where e.book_id = b.id), '[]'::jsonb)
  ) into result from public.pc_books b where b.id = bid;
  return result;
end $$;

create or replace function public.pc_create(p_owner_token text, p_viewer_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_owner_token is null or p_viewer_token is null or
    p_owner_token !~ '^[a-f0-9]{64}$' or p_viewer_token !~ '^[a-f0-9]{64}$' or p_owner_token = p_viewer_token then
    raise exception 'Invalid access keys';
  end if;
  -- Never permit the same capability to identify more than one cashbook/role.
  -- Serialize key changes to make the cross-column uniqueness check race-safe.
  perform pg_advisory_xact_lock(764218493);
  if exists (select 1 from public.pc_books where owner_hash = sha256(convert_to(p_owner_token, 'UTF8'))) then
    return public.pc_open(p_owner_token);
  end if;
  if exists (select 1 from public.pc_books where
    owner_hash in (sha256(convert_to(p_owner_token, 'UTF8')), sha256(convert_to(p_viewer_token, 'UTF8'))) or
    viewer_hash in (sha256(convert_to(p_owner_token, 'UTF8')), sha256(convert_to(p_viewer_token, 'UTF8')))) then
    raise exception 'These access keys are already in use';
  end if;
  -- Idempotent recovery if the network loses the response after creation.
  insert into public.pc_books(owner_hash, viewer_hash)
    values (sha256(convert_to(p_owner_token, 'UTF8')), sha256(convert_to(p_viewer_token, 'UTF8')))
    on conflict (owner_hash) do nothing;
  return public.pc_open(p_owner_token);
end $$;

create or replace function public.pc_add(p_token text, p_transaction jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare bid uuid; entry public.pc_entries;
begin
  bid := public.pc_authorize(p_token, true);
  insert into public.pc_entries(id, book_id, date, description, category, amount, type, notes)
  values ((p_transaction->>'id')::uuid, bid, (p_transaction->>'date')::date,
    trim(p_transaction->>'description'), trim(p_transaction->>'category'),
    (p_transaction->>'amount')::numeric, p_transaction->>'type', nullif(p_transaction->>'notes', ''))
  on conflict (id) do nothing;
  select * into entry from public.pc_entries where id = (p_transaction->>'id')::uuid and book_id = bid;
  if not found then raise exception 'Transaction ID conflict'; end if;
  return to_jsonb(entry) - 'book_id';
end $$;

create or replace function public.pc_delete(p_token text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  bid := public.pc_authorize(p_token, true);
  delete from public.pc_entries where id = p_id and book_id = bid;
end $$;

create or replace function public.pc_save_settings(p_token text, p_settings jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  bid := public.pc_authorize(p_token, true);
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' or octet_length(p_settings::text) > 20000 then
    raise exception 'Invalid settings';
  end if;
  update public.pc_books set settings = jsonb_build_object(
    'senderName', left(coalesce(p_settings->>'senderName', ''), 200),
    'companyName', left(coalesce(p_settings->>'companyName', ''), 200),
    'recipientName', left(coalesce(p_settings->>'recipientName', ''), 200),
    'recipientPhone', left(coalesce(p_settings->>'recipientPhone', ''), 100),
    'recipientEmail', left(coalesce(p_settings->>'recipientEmail', ''), 320)
  ) where id = bid;
end $$;

create or replace function public.pc_clear(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  bid := public.pc_authorize(p_token, true);
  delete from public.pc_entries where book_id = bid;
  update public.pc_books set settings = '{}'::jsonb where id = bid;
end $$;

-- Replacing a viewing link immediately invalidates the previous one, including
-- browsers that saved it. No long-lived memberships can bypass link revocation.
create or replace function public.pc_replace_viewer(p_token text, p_viewer_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  bid := public.pc_authorize(p_token, true);
  if p_viewer_token is null or p_viewer_token !~ '^[a-f0-9]{64}$' or p_viewer_token = p_token then
    raise exception 'Invalid viewing key';
  end if;
  perform pg_advisory_xact_lock(764218493);
  if exists (select 1 from public.pc_books where id <> bid and
    (owner_hash = sha256(convert_to(p_viewer_token, 'UTF8')) or viewer_hash = sha256(convert_to(p_viewer_token, 'UTF8')))) then
    raise exception 'This viewing key is already in use';
  end if;
  update public.pc_books set viewer_hash = sha256(convert_to(p_viewer_token, 'UTF8')) where id = bid;
end $$;

-- Functions otherwise default to PUBLIC EXECUTE. Grant only this narrow API.
revoke all on function public.pc_open(text), public.pc_create(text,text),
  public.pc_add(text,jsonb), public.pc_delete(text,uuid), public.pc_save_settings(text,jsonb),
  public.pc_clear(text), public.pc_replace_viewer(text,text) from public;
grant execute on function public.pc_open(text), public.pc_create(text,text),
  public.pc_add(text,jsonb), public.pc_delete(text,uuid), public.pc_save_settings(text,jsonb),
  public.pc_clear(text), public.pc_replace_viewer(text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
