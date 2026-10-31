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
