-- Apply after 002. Browser roles can register their own endpoint only through
-- capability-checked functions. Financial writes enqueue work transactionally.
begin;
create table if not exists public.pc_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.pc_books(id) on delete cascade,
  capability_hash bytea not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.pc_push_jobs (
  book_id uuid primary key references public.pc_books(id) on delete cascade,
  revision bigint not null default 1,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_id uuid,
  locked_until timestamptz
);
alter table public.pc_push_subscriptions enable row level security;
alter table public.pc_push_jobs enable row level security;
revoke all on public.pc_push_subscriptions, public.pc_push_jobs from public, anon, authenticated;

create or replace function public.pc_push_subscribe(p_token text, p_subscription jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare bid uuid; v_endpoint text; v_p256dh text; v_auth text;
begin
  bid := public.pc_authorize(p_token);
  v_endpoint := p_subscription->>'endpoint';
  v_p256dh := p_subscription->'keys'->>'p256dh';
  v_auth := p_subscription->'keys'->>'auth';
  -- Restrict delivery to known Web Push services. Arbitrary URLs must never be
  -- accepted by a server-side HTTP sender (SSRF). Dispatcher validates again.
  if v_endpoint is null or length(v_endpoint) > 4096 or v_endpoint !~
    '^https://(web[.]push[.]apple[.]com|fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com)/[A-Za-z0-9_/?=&%.+:~-]+$'
    or v_p256dh is null or v_p256dh !~ '^[A-Za-z0-9_-]{87}=?$'
    or v_auth is null or v_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$' then
    raise exception 'Invalid push subscription';
  end if;
  perform pg_advisory_xact_lock(hashtext(bid::text));
  if not exists (select 1 from public.pc_push_subscriptions where endpoint = v_endpoint and book_id = bid)
    and (select count(*) from public.pc_push_subscriptions where book_id = bid) >= 20 then
    raise exception 'Notification device limit reached';
  end if;
  insert into public.pc_push_subscriptions(book_id, capability_hash, endpoint, p256dh, auth)
    values (bid, sha256(convert_to(p_token, 'UTF8')), v_endpoint, v_p256dh, v_auth)
    on conflict (endpoint) do update set book_id = excluded.book_id,
      capability_hash = excluded.capability_hash, p256dh = excluded.p256dh,
      auth = excluded.auth, updated_at = now();
end $$;

create or replace function public.pc_push_status(p_token text, p_endpoint text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  bid := public.pc_authorize(p_token);
  return exists (select 1 from public.pc_push_subscriptions s where s.book_id = bid
    and s.endpoint = p_endpoint and s.capability_hash = sha256(convert_to(p_token, 'UTF8')));
end $$;

create or replace function public.pc_push_unsubscribe(p_token text, p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  bid := public.pc_authorize(p_token);
  delete from public.pc_push_subscriptions s where s.book_id = bid
    and s.endpoint = p_endpoint and s.capability_hash = sha256(convert_to(p_token, 'UTF8'));
end $$;

create or replace function public.pc_enqueue_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare bid uuid;
begin
  if tg_table_name = 'pc_books' then
    -- Immediately revoke subscriptions registered using replaced access links.
    delete from public.pc_push_subscriptions where book_id = new.id
      and capability_hash <> new.owner_hash and capability_hash <> new.viewer_hash;
    if new.settings is not distinct from old.settings then return null; end if;
    bid := new.id;
  elsif tg_op = 'DELETE' then bid := old.book_id;
  else bid := new.book_id;
  end if;
  if not exists (select 1 from public.pc_books where id = bid) then return null; end if;
  insert into public.pc_push_jobs(book_id) values (bid)
    on conflict (book_id) do update set revision = public.pc_push_jobs.revision + 1,
      attempts = 0, available_at = now();
  return null;
end $$;
revoke all on function public.pc_enqueue_push() from public, anon, authenticated;
drop trigger if exists pc_entries_notify on public.pc_entries;
create trigger pc_entries_notify after insert or update or delete on public.pc_entries
  for each row execute function public.pc_enqueue_push();
drop trigger if exists pc_books_notify on public.pc_books;
create trigger pc_books_notify after update on public.pc_books
  for each row execute function public.pc_enqueue_push();

-- Private queue API. Leases recover abandoned workers; revisions preserve
-- changes arriving during a send. Multiple workers cannot claim the same lease.
create or replace function public.pc_push_claim(p_limit integer default 20)
returns table(book_id uuid, revision bigint, lease_id uuid)
language sql security definer set search_path = '' as $$
  with ready as (
    select j.book_id from public.pc_push_jobs j where j.available_at <= now()
      and (j.locked_until is null or j.locked_until < now()) and j.attempts < 8
      order by j.available_at limit least(greatest(p_limit, 1), 50) for update skip locked
  )
  update public.pc_push_jobs j set locked_until = now() + interval '3 minutes',
    lease_id = gen_random_uuid(), attempts = attempts + 1
  from ready r where j.book_id = r.book_id returning j.book_id, j.revision, j.lease_id;
$$;

create or replace function public.pc_push_finish(p_book_id uuid, p_revision bigint, p_lease_id uuid, p_retry boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not p_retry then
    delete from public.pc_push_jobs where book_id = p_book_id and lease_id = p_lease_id and revision = p_revision;
    update public.pc_push_jobs set lease_id = null, locked_until = null, attempts = 0, available_at = now()
      where book_id = p_book_id and lease_id = p_lease_id;
  else
    update public.pc_push_jobs set lease_id = null, locked_until = null,
      available_at = now() + least(power(2, attempts), 60) * interval '1 minute'
      where book_id = p_book_id and lease_id = p_lease_id;
  end if;
end $$;

revoke all on function public.pc_push_subscribe(text,jsonb), public.pc_push_status(text,text),
  public.pc_push_unsubscribe(text,text), public.pc_push_claim(integer),
  public.pc_push_finish(uuid,bigint,uuid,boolean) from public, anon, authenticated;
grant execute on function public.pc_push_subscribe(text,jsonb), public.pc_push_status(text,text),
  public.pc_push_unsubscribe(text,text) to anon, authenticated;
-- Supabase supplies service_role. Conditional grant also permits local SQL tests.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.pc_push_claim(integer), public.pc_push_finish(uuid,bigint,uuid,boolean) to service_role;
    grant select, delete on public.pc_push_subscriptions to service_role;
    grant select on public.pc_books to service_role;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
