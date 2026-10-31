"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { WeekPicker } from "@/components/app/WeekPicker";
import { useAuth } from "@/components/app/Auth";
import { useToast } from "@/components/app/Toast";
import { sb } from "@/lib/supabase";
import { BRANDS, EVENT_TYPES, LOCATIONS, eventType, type BrandId, type LocationId } from "@/lib/constants";
import { addDays, dateShort, dayName, feeShort, parseDate, planningWeek, timeRange, toISO, todayIST } from "@/lib/format";
import { copyText } from "@/lib/export";
import type { EventRow } from "@/lib/types";

type Scope = "week" | "upcoming" | "past";

export default function EventsPage() {
  const { profile, session } = useAuth();
  const toast = useToast();
  const [week, setWeek] = useState(planningWeek());
  const [scope, setScope] = useState<Scope>("week");
  const [loc, setLoc] = useState<LocationId | "all">("all");
  const [type, setType] = useState("all");
  const [brand, setBrand] = useState<BrandId | "all">("all");
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, { confirmed: number; waitlist: number }>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("week");
    if (w) setWeek(w);
  }, []);

  const load = useCallback(async () => {
    let query = sb().from("events").select("*").order("event_date").order("start_time");
    const today = toISO(todayIST());
    if (scope === "week") query = query.gte("event_date", week).lte("event_date", toISO(addDays(parseDate(week), 6)));
    if (scope === "upcoming") query = query.gte("event_date", today);
    if (scope === "past") query = query.lt("event_date", today).order("event_date", { ascending: false }).limit(200);
    const [{ data, error }, { data: c }, { data: p }] = await Promise.all([query, sb().rpc("rsvp_counts"), sb().from("profiles").select("id, full_name, email")]);
    if (error) return toast(error.message, "err");
    setEvents((data as EventRow[]) ?? []);
    setCounts(Object.fromEntries(((c as { event_id: string; confirmed: number; waitlist: number }[]) ?? []).map((r) => [r.event_id, { confirmed: Number(r.confirmed), waitlist: Number(r.waitlist) }])));
    setNames(Object.fromEntries(((p as { id: string; full_name: string | null; email: string }[]) ?? []).map((r) => [r.id, r.full_name || r.email])));
  }, [scope, week, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(
    () =>
      (events ?? []).filter(
        (e) =>
          (loc === "all" || e.location === loc) &&
          (type === "all" || e.event_type === type) &&
          (brand === "all" || e.brands?.includes(brand)) &&
          (!q || `${e.name} ${e.host ?? ""} ${e.venue ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      ),
    [events, loc, type, brand, q]
  );

  async function remove(e: EventRow) {
    if (!confirm(`Delete "${e.name}"? Its RSVPs will be deleted too.`)) return;
    const { error } = await sb().from("events").delete().eq("id", e.id);
    if (error) toast(error.message, "err");
    else {
      toast("Event deleted");
      load();
    }
  }

  const canDelete = (e: EventRow) => profile?.role === "admin" || e.created_by === session?.user.id;
  const types = [...new Set((events ?? []).map((e) => e.event_type))];

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-extrabold">Events</h1>
          <p className="text-mute text-sm">Everything both locations have planned, in one list.</p>
        </div>
        <Link href="/events/new" className="btn-primary">
          + Add an event
        </Link>
      </div>

      <div className="card p-3 sm:p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {(["week", "upcoming", "past"] as Scope[]).map((s) => (
            <button key={s} className={`chip ${scope === s ? "chip-on" : ""}`} onClick={() => setScope(s)}>
              {s === "week" ? "One week" : s === "upcoming" ? "All upcoming" : "Past"}
            </button>
          ))}
        </div>
        {scope === "week" && <WeekPicker week={week} onChange={setWeek} />}
        <select className="input !w-auto" value={loc} onChange={(e) => setLoc(e.target.value as LocationId | "all")} aria-label="Location">
          <option value="all">Both locations</option>
          <option value="goa">Goa</option>
          <option value="dharamkot">Dharamkot</option>
        </select>
        <select className="input !w-auto" value={brand} onChange={(e) => setBrand(e.target.value as BrandId | "all")} aria-label="Brand">
          <option value="all">All brands</option>
          {(Object.keys(BRANDS) as BrandId[]).map((b) => (
            <option key={b} value={b}>{BRANDS[b].name}</option>
          ))}
        </select>
        <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="all">All types</option>
          {[...new Set([...EVENT_TYPES.map((t) => t.slug), ...types])].filter((t) => types.includes(t)).map((t) => (
            <option key={t} value={t}>{eventType(t).emoji} {eventType(t).name}</option>
          ))}
        </select>
        <input className="input !w-auto flex-1 min-w-[160px]" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {events === null ? (
        <p className="text-mute">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-hand text-3xl text-moss">nothing here yet</p>
          <p className="text-mute mt-1 mb-4">Add this week&apos;s events and the studio will make the posters.</p>
          <Link href="/events/new" className="btn-primary">+ Add an event</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-mute">
              <tr className="border-b border-line">
                <th className="p-3 font-semibold">When</th>
                <th className="p-3 font-semibold">Event</th>
                <th className="p-3 font-semibold">Where</th>
                <th className="p-3 font-semibold">Entry</th>
                <th className="p-3 font-semibold">RSVP</th>
                <th className="p-3 font-semibold">Added by</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const t = eventType(e.event_type);
                const c = counts[e.id];
                return (
                  <tr key={e.id} className="border-b border-line last:border-0 align-top hover:bg-ground/60">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold">{dayName(e.event_date, true)} {dateShort(e.event_date)}</div>
                      <div className="text-mute">{timeRange(e)}</div>
                    </td>
                    <td className="p-3 min-w-[200px]">
                      <div className="font-semibold">{t.emoji} {e.name}</div>
                      <div className="text-mute">
                        {t.name} · {(e.brands ?? []).map((b) => BRANDS[b]?.name).join(" × ")}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${e.location === "goa" ? "bg-[#F6DFC0] text-[#7a3a1a]" : "bg-[#d8e3dc] text-[#1E3A31]"}`}>{LOCATIONS[e.location].name}</span>
                      <div className="text-mute mt-1">{e.venue}{e.spot ? ` · ${e.spot}` : ""}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{feeShort(e)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {e.rsvp_mode === "none" && <span className="text-mute">Walk in</span>}
                      {e.rsvp_mode === "link" && <span>External link</span>}
                      {e.rsvp_mode === "phone" && <span>WhatsApp</span>}
                      {e.rsvp_mode === "form" && (
                        <div>
                          <div className="font-semibold">
                            {c?.confirmed ?? 0}
                            {e.capacity ? ` / ${e.capacity}` : ""} going
                          </div>
                          {c?.waitlist ? <div className="text-mute">{c.waitlist} waitlisted</div> : null}
                          <button className="underline text-xs text-mute" onClick={() => copyText(`${window.location.origin}/rsvp/${e.id}`).then(() => toast("RSVP link copied"))}>
                            Copy RSVP link
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-mute">{e.created_by ? names[e.created_by] ?? "" : ""}</td>
                    <td className="p-3 whitespace-nowrap text-right">
                      <Link className="btn-ghost btn-sm" href={`/events/${e.id}`}>Edit</Link>{" "}
                      <Link className="btn-ghost btn-sm" href={`/events/new?copy=${e.id}`} title="Copy to the next week">Copy</Link>{" "}
                      {canDelete(e) && (
                        <button className="btn-ghost btn-sm" onClick={() => remove(e)}>Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {scope === "week" && shown.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Link href={`/?week=${week}`} className="btn-primary">Make this week&apos;s posters</Link>
        </div>
      )}
    </Shell>
  );
}
