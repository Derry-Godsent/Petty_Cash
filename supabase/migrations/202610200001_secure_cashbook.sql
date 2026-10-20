-- SUPERSEDED for the current private-link app. Apply 202610200002_private_links.sql instead.
-- If this migration was already applied, apply 002 afterward. Never run 001 after 002.
-- Back up/export existing data BEFORE applying. Legacy browser IDs are not proof
-- of ownership and are intentionally NOT automatically claimed by new sessions.
-- Supports the original schema; does not delete existing rows.
begin;

create table if not exists public.transactions (
  id text primary key,
  user_id text not null,
  date date not null,
  description text not null,
  category text not null,
  amount numeric(10,2) not null,
  type text not null check (type in ('income', 'expense')),
  notes text,
  team_code text,
  created_at timestamptz not null default now()
);
alter table public.transactions add column if not exists team_code text;
alter table public.transactions add column if not exists notes text;
alter table public.transactions add column if not exists created_at timestamptz not null default now();

create table if not exists public.settings (
  user_id text primary key,
  recipient_name text,
  recipient_phone text,
  recipient_email text,
  sender_name text,
  company_name text,
  team_code text,
  updated_at timestamptz not null default now()
);
alter table public.settings add column if not exists recipient_email text;
alter table public.settings add column if not exists team_code text;
alter table public.settings add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_team_code on public.transactions(team_code);
create index if not exists idx_transactions_date on public.transactions(date desc);

-- NOT VALID preserves legacy rows while enforcing validation for new writes.
alter table public.transactions drop constraint if exists cashbook_valid_transaction;
alter table public.transactions add constraint cashbook_valid_transaction check (
  amount > 0 and amount <= 99999999.99 and
  length(trim(description)) > 0 and length(trim(category)) > 0 and
  type in ('income', 'expense')
) not valid;

alter table public.transactions enable row level security;
alter table public.settings enable row level security;

-- Remove EVERY old policy: permissive policies combine with OR and would
-- otherwise silently bypass the secure policies below.
do $$ declare p record;
begin
  for p in select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('transactions', 'settings')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

revoke all on public.transactions, public.settings from anon;
grant select, insert, update, delete on public.transactions, public.settings to authenticated;

create policy settings_owner_select on public.settings for select to authenticated
  using (user_id = (select auth.uid())::text);
create policy settings_owner_insert on public.settings for insert to authenticated
  with check (user_id = (select auth.uid())::text);
create policy settings_owner_update on public.settings for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
create policy settings_owner_delete on public.settings for delete to authenticated
  using (user_id = (select auth.uid())::text);

-- Team codes are bearer invitations. Membership is the current user's saved
-- code, never a client-supplied user ID. Use long, randomly generated codes.
create policy transactions_read on public.transactions for select to authenticated
  using (
    (team_code is null and user_id = (select auth.uid())::text)
    or (team_code is not null and exists (
      select 1 from public.settings s where s.user_id = (select auth.uid())::text
      and nullif(s.team_code, '') = transactions.team_code
    ))
  );
create policy transactions_insert on public.transactions for insert to authenticated
  with check (
    user_id = (select auth.uid())::text and (
      team_code is null or exists (
        select 1 from public.settings s where s.user_id = (select auth.uid())::text
        and nullif(s.team_code, '') = transactions.team_code
      )
    )
  );
create policy transactions_delete on public.transactions for delete to authenticated
  using (
    (team_code is null and user_id = (select auth.uid())::text)
    or (team_code is not null and exists (
      select 1 from public.settings s where s.user_id = (select auth.uid())::text
      and nullif(s.team_code, '') = transactions.team_code
    ))
  );
-- No transaction UPDATE policy: ownership and team cannot be reassigned.

-- Include transactions in Realtime once, if the project has that publication.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'transactions') then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
