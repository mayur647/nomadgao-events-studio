-- 004: poster archive + remembered looks.
-- Run once in Supabase → SQL Editor. Safe to run again.

-- The look the team settled on for a week (shuffles + caption edits), so the Studio reopens the same.
create table if not exists public.week_looks (
  week_start date primary key,
  seed bigint not null,
  offsets jsonb not null default '{}'::jsonb,
  captions jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Every poster that was downloaded or shared: the image itself + its captions. One row per poster per size per week
-- (downloading again replaces it with the latest version).
create table if not exists public.saved_posters (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  poster_key text not null,
  size text not null check (size in ('story','post','square')),
  kind text not null,
  location text,
  label text not null,
  sub text,
  look text,
  event_id uuid references public.events(id) on delete set null,
  event_date date,
  image_path text not null,
  captions jsonb not null default '{}'::jsonb,
  saved_by uuid references public.profiles(id) on delete set null,
  saved_at timestamptz not null default now(),
  unique (week_start, poster_key, size)
);
create index if not exists saved_posters_week_idx on public.saved_posters(week_start desc);

alter table public.week_looks enable row level security;
alter table public.saved_posters enable row level security;

drop policy if exists "week_looks staff" on public.week_looks;
create policy "week_looks staff" on public.week_looks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "saved_posters staff read" on public.saved_posters;
create policy "saved_posters staff read" on public.saved_posters for select to authenticated using (public.is_staff());
drop policy if exists "saved_posters staff write" on public.saved_posters;
create policy "saved_posters staff write" on public.saved_posters for insert to authenticated with check (public.is_staff());
drop policy if exists "saved_posters staff update" on public.saved_posters;
create policy "saved_posters staff update" on public.saved_posters for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "saved_posters admin delete" on public.saved_posters;
create policy "saved_posters admin delete" on public.saved_posters for delete to authenticated using (public.is_admin() or saved_by = auth.uid());
