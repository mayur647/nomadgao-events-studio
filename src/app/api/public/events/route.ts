import { BRANDS, LOCATIONS, eventType, type BrandId, type LocationId } from "@/lib/constants";
import { feeText, rsvpUrl, timeRange, venueLine } from "@/lib/format";
import type { EventRow } from "@/lib/types";

/**
 * Public feed of upcoming events, for the NomadGao website (or anyone embedding the calendar).
 *
 *   GET /api/public/events                 → JSON, next 60 days, both locations
 *   GET /api/public/events?location=goa    → one location (goa | dharamkot)
 *   GET /api/public/events?days=14         → shorter window (1–366)
 *   GET /api/public/events?brand=hotpot    → only events with that brand
 *   GET /api/public/events?format=ics      → calendar file people can subscribe to
 *
 * Residents-only events are left out. No guest or team data is ever included.
 */

export const runtime = "nodejs";
export const revalidate = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

type Row = EventRow & { confirmed: number | null };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const loc = url.searchParams.get("location");
  const location = loc === "goa" || loc === "dharamkot" ? loc : null;
  const days = Math.min(366, Math.max(1, Number(url.searchParams.get("days")) || 60));
  const brand = url.searchParams.get("brand") as BrandId | null;
  const format = url.searchParams.get("format");

  if (!SUPABASE_URL || !ANON) return Response.json({ error: "Feed not configured" }, { status: 503, headers: CORS });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_public_events`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_location: location, p_days: days }),
    next: { revalidate: 300 },
  });
  if (!res.ok) return Response.json({ error: "Couldn't load events" }, { status: 502, headers: CORS });
  let rows = ((await res.json()) as Row[] | null) ?? [];
  if (brand && brand in BRANDS) rows = rows.filter((r) => r.brands?.includes(brand));

  const events = rows.map((e) => toPublic(e, origin));
  if (format === "ics") {
    return new Response(toIcs(events), {
      headers: { ...CORS, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="nomadgao-events.ics"' },
    });
  }
  return Response.json({ generated_at: new Date().toISOString(), count: events.length, events }, { headers: CORS });
}

function toPublic(e: Row, origin: string) {
  const t = eventType(e.event_type);
  const left = e.rsvp_mode === "form" && e.limited_seats && e.capacity ? Math.max(0, e.capacity - (e.confirmed ?? 0)) : null;
  return {
    id: e.id,
    name: e.name,
    type: { slug: t.slug, name: t.name, emoji: t.emoji },
    location: { id: e.location, name: LOCATIONS[e.location as LocationId].name, place: LOCATIONS[e.location as LocationId].place },
    brands: (e.brands ?? []).map((b) => ({ id: b, name: BRANDS[b as BrandId]?.name ?? b })),
    date: e.event_date,
    start_time: e.start_time?.slice(0, 5) ?? null,
    end_time: e.end_time?.slice(0, 5) ?? null,
    time_label: timeRange(e) || null,
    venue: venueLine(e),
    description: e.description,
    host: e.host,
    what_to_bring: e.what_to_bring,
    byob: e.byob,
    fee: { type: e.fee_type, amount: e.fee_amount, note: e.fee_note, label: feeText(e) },
    rsvp: { mode: e.rsvp_mode, url: rsvpUrl(e, origin), spots_left: left },
    photo_url: e.photo_path ? (e.photo_path.startsWith("http") ? e.photo_path : `${SUPABASE_URL}/storage/v1/object/public/media/${e.photo_path}`) : null,
  };
}

type PublicEvent = ReturnType<typeof toPublic>;

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const fold = (line: string) => line.match(/.{1,73}/g)?.join("\r\n ") ?? line;

function icsDate(date: string, time: string | null) {
  const d = date.replace(/-/g, "");
  return time ? `;TZID=Asia/Kolkata:${d}T${time.replace(":", "")}00` : `;VALUE=DATE:${d}`;
}

function toIcs(events: PublicEvent[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NomadGao//Events Studio//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:NomadGao events", "X-WR-TIMEZONE:Asia/Kolkata"];
  for (const e of events) {
    const desc = [e.description, `Entry: ${e.fee.label}`, e.rsvp.url ? `RSVP: ${e.rsvp.url}` : null].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${e.id}@nomadgao`, `DTSTAMP:${stamp}`, `DTSTART${icsDate(e.date, e.start_time)}`);
    if (e.start_time && e.end_time && e.end_time > e.start_time) lines.push(`DTEND${icsDate(e.date, e.end_time)}`);
    lines.push(`SUMMARY:${icsText(e.name)}`, `LOCATION:${icsText(e.venue.includes(e.location.place.split(",")[0]) ? e.venue : `${e.venue}, ${e.location.place}`)}`, `DESCRIPTION:${icsText(desc)}`);
    if (e.rsvp.url) lines.push(`URL:${e.rsvp.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
