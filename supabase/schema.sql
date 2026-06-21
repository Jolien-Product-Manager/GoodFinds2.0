-- GoodFinds Supabase schema (safe to re-run)
-- Dashboard: SQL -> New query -> paste all -> Run
--
-- Auth setup (not SQL):
--   Site URL + Redirect URL: https://YOUR_APP.onrender.com/auth/callback
--   Enable Email magic link provider
--   Render env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_set_updated_at on public.user_state;

create trigger user_state_set_updated_at
  before update on public.user_state
  for each row
  execute procedure public.set_user_state_updated_at();

alter table public.user_state enable row level security;

drop policy if exists "Users read own state" on public.user_state;
drop policy if exists "Users insert own state" on public.user_state;
drop policy if exists "Users update own state" on public.user_state;

create policy "Users read own state"
  on public.user_state
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own state"
  on public.user_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own state"
  on public.user_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update on public.user_state to authenticated;
