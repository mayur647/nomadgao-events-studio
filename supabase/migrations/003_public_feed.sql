-- 003: public events feed for the NomadGao website.
-- Run once in Supabase → SQL Editor. Safe to run again.
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
