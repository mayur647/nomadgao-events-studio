-- NomadGao Events Studio — database schema
-- Run this once in Supabase → SQL Editor (safe to re-run).

-- ───────────────────────── People & roles ─────────────────────────
create table if not exists public.admin_emails (
  email text primary key
);
insert into public.admin_emails(email) values ('mayur@nomadgao.com') on conflict do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'pending' check (role in ('pending','manager','admin','disabled')),
  location text check (location in ('goa','dharamkot')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'));
$$;

-- Invites: an admin adds someone's email in advance; they're approved the moment they first sign in.
create table if not exists public.invites (
  email text primary key,
  role text not null default 'manager' check (role in ('manager','admin')),
  location text check (location in ('goa','dharamkot')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
drop policy if exists "invites admin" on public.invites;
create policy "invites admin" on public.invites for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites;
  r text := 'pending';
begin
  select * into inv from public.invites where lower(email) = lower(new.email);
  if exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email)) then
    r := 'admin';
  elsif inv.email is not null then
    r := inv.role;
  end if;
  insert into public.profiles(id, email, full_name, role, location)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    r,
    inv.location
  )
  on conflict (id) do nothing;
  delete from public.invites where lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();



-- ───────────────────────── Events ─────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('goa','dharamkot')),
  brands text[] not null default '{nomadgao}',
  name text not null,
  event_type text not null default 'other',
  event_date date not null,
  start_time time,
  end_time time,
  venue text,
  spot text,
  fee_type text not null default 'free' check (fee_type in ('free','paid','pwyw','custom')),
  fee_amount integer,
  fee_note text,
  rsvp_mode text not null default 'none' check (rsvp_mode in ('none','form','link','phone')),
  rsvp_link text,
  rsvp_phone text,
  show_qr boolean not null default true,
  host text,
  description text,
  what_to_bring text,
  limited_seats boolean not null default false,
  capacity integer,
  byob boolean not null default false,
  audience text not null default 'open' check (audience in ('open','residents')),
  photo_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_date_idx on public.events(event_date);

-- ───────────────────────── RSVPs ─────────────────────────
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  guests integer not null default 1 check (guests between 1 and 10),
  staying_with_us boolean not null default false,
  note text,
  status text not null default 'confirmed' check (status in ('confirmed','waitlist','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists rsvps_event_idx on public.rsvps(event_id);

-- ───────────────────────── Photo gallery ─────────────────────────
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  location text not null default 'any' check (location in ('goa','dharamkot','any')),
  event_type text not null,
  path text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists photos_type_idx on public.photos(event_type);

-- ───────────────────────── Activity log (what got generated) ─────────────────────────
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null,          -- event_poster | location_calendar | joint_calendar | caption_ai
  action text not null,        -- download | zip | share | whatsapp | copy | ai
  location text,
  size text,
  template text,
  event_id uuid references public.events(id) on delete set null,
  week_start date,
  count integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists generations_created_idx on public.generations(created_at);

-- ───────────────────────── Row level security ─────────────────────────
alter table public.admin_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.photos enable row level security;
alter table public.generations enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events staff read" on public.events;
create policy "events staff read" on public.events for select using (public.is_staff());
drop policy if exists "events staff insert" on public.events;
create policy "events staff insert" on public.events for insert with check (public.is_staff());
drop policy if exists "events staff update" on public.events;
create policy "events staff update" on public.events for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "events delete" on public.events;
create policy "events delete" on public.events for delete
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()));

drop policy if exists "rsvps admin read" on public.rsvps;
create policy "rsvps admin read" on public.rsvps for select using (public.is_admin());
drop policy if exists "rsvps admin update" on public.rsvps;
create policy "rsvps admin update" on public.rsvps for update using (public.is_admin());
drop policy if exists "rsvps admin delete" on public.rsvps;
create policy "rsvps admin delete" on public.rsvps for delete using (public.is_admin());

drop policy if exists "photos staff read" on public.photos;
create policy "photos staff read" on public.photos for select using (public.is_staff());
drop policy if exists "photos staff insert" on public.photos;
create policy "photos staff insert" on public.photos for insert with check (public.is_staff());
drop policy if exists "photos delete" on public.photos;
create policy "photos delete" on public.photos for delete
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()));

drop policy if exists "generations insert own" on public.generations;
create policy "generations insert own" on public.generations for insert
  with check (public.is_staff() and user_id = auth.uid());
drop policy if exists "generations admin read" on public.generations;
create policy "generations admin read" on public.generations for select using (public.is_admin());

-- ───────────────────────── Public RSVP functions ─────────────────────────
create or replace function public.get_public_event(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', e.id, 'name', e.name, 'event_type', e.event_type, 'location', e.location, 'brands', e.brands,
    'event_date', e.event_date, 'start_time', e.start_time, 'end_time', e.end_time,
    'venue', e.venue, 'spot', e.spot, 'fee_type', e.fee_type, 'fee_amount', e.fee_amount, 'fee_note', e.fee_note,
    'host', e.host, 'description', e.description, 'what_to_bring', e.what_to_bring,
    'byob', e.byob, 'audience', e.audience, 'limited_seats', e.limited_seats, 'capacity', e.capacity,
    'confirmed', coalesce((select sum(r.guests) from public.rsvps r where r.event_id = e.id and r.status = 'confirmed'), 0)
  )
  from public.events e
  where e.id = p_id and e.rsvp_mode = 'form';
$$;

create or replace function public.submit_rsvp(
  p_event uuid, p_name text, p_phone text, p_email text, p_guests int, p_staying boolean, p_note text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  taken int;
  st text := 'confirmed';
begin
  select * into ev from public.events where id = p_event and rsvp_mode = 'form';
  if not found then raise exception 'This event is not taking RSVPs here.'; end if;
  if ev.event_date < (now() at time zone 'Asia/Kolkata')::date then raise exception 'This event has already happened.'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' then raise exception 'Please add your name and phone number.'; end if;
  if p_guests is null or p_guests < 1 or p_guests > 10 then raise exception 'Guests must be between 1 and 10.'; end if;
  if ev.limited_seats and ev.capacity is not null then
    select coalesce(sum(guests),0) into taken from public.rsvps where event_id = p_event and status = 'confirmed';
    if taken + p_guests > ev.capacity then st := 'waitlist'; end if;
  end if;
  insert into public.rsvps(event_id, name, phone, email, guests, staying_with_us, note, status)
  values (p_event, left(trim(p_name),120), left(trim(p_phone),40), nullif(left(trim(coalesce(p_email,'')),160),''),
          p_guests, coalesce(p_staying,false), nullif(left(trim(coalesce(p_note,'')),500),''), st);
  return st;
end $$;

-- RSVP head-counts for the team (managers see numbers, admins see names)
create or replace function public.rsvp_counts() returns table(event_id uuid, confirmed bigint, waitlist bigint)
language sql stable security definer set search_path = public as $$
  select r.event_id,
         coalesce(sum(r.guests) filter (where r.status = 'confirmed'),0),
         coalesce(sum(r.guests) filter (where r.status = 'waitlist'),0)
  from public.rsvps r
  where public.is_staff()
  group by r.event_id;
$$;

grant execute on function public.get_public_event(uuid) to anon, authenticated;
grant execute on function public.submit_rsvp(uuid,text,text,text,int,boolean,text) to anon, authenticated;
grant execute on function public.rsvp_counts() to authenticated;

-- ───────────────────────── Storage (photos) ─────────────────────────
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do update set public = true;

drop policy if exists "media staff upload" on storage.objects;
create policy "media staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (public.is_admin() or owner = auth.uid()));

-- ───────────────────────── Public feed (website) ─────────────────────────
-- Returns upcoming events with public fields only (no RSVP guest data, no team info).

create or replace function public.list_public_events(
  p_location text default null,
  p_days int default 60,
  p_include_residents boolean default false
) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.event_date, x.start_time nulls last), '[]'::json)
  from (
    select
      e.id, e.name, e.event_type, e.location, e.brands, e.event_date, e.start_time, e.end_time,
      e.venue, e.spot, e.fee_type, e.fee_amount, e.fee_note, e.rsvp_mode,
      case when e.rsvp_mode = 'link' then e.rsvp_link end as rsvp_link,
      case when e.rsvp_mode = 'phone' then e.rsvp_phone end as rsvp_phone,
      e.host, e.description, e.what_to_bring, e.byob, e.audience, e.limited_seats, e.capacity, e.photo_path,
      case when e.rsvp_mode = 'form' then
        coalesce((select sum(r.guests) from public.rsvps r where r.event_id = e.id and r.status = 'confirmed'), 0)
      end as confirmed
    from public.events e
    where e.event_date >= (now() at time zone 'Asia/Kolkata')::date
      and e.event_date <= (now() at time zone 'Asia/Kolkata')::date + least(greatest(coalesce(p_days, 60), 1), 366)
      and (p_location is null or e.location = p_location)
      and (p_include_residents or e.audience = 'open')
  ) x;
$$;

grant execute on function public.list_public_events(text, int, boolean) to anon, authenticated;

-- ───────────────────────── Poster archive ─────────────────────────

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
