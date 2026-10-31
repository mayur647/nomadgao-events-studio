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

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email))
         then 'admin' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','manager'));
$$;

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
