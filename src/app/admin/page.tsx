"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { useAuth } from "@/components/app/Auth";
import { useToast } from "@/components/app/Toast";
import { sb } from "@/lib/supabase";
import { LOCATIONS, eventType } from "@/lib/constants";
import { addDays, dateShort, dayName, toISO, todayIST } from "@/lib/format";
import { copyText, downloadBlob } from "@/lib/export";
import type { EventRow, GenerationRow, Profile, RsvpRow } from "@/lib/types";

type Tab = "overview" | "people" | "rsvps" | "data";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join(" + ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
const saveCsv = (rows: Record<string, unknown>[], name: string) => downloadBlob(new Blob(["﻿" + csv(rows)], { type: "text/csv" }), name);

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-mute">{label}</div>
      <div className="font-display text-3xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-xs text-mute mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <Shell adminOnly wide>
      <h1 className="font-display text-3xl font-extrabold mb-4">Admin</h1>
      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        {([["overview", "Overview"], ["people", "People & access"], ["rsvps", "RSVPs"], ["data", "Export data"]] as [Tab, string][]).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={`chip ${tab === v ? "chip-on" : ""}`} onClick={() => setTab(v)}>
            {l}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "people" && <People />}
      {tab === "rsvps" && <Rsvps />}
      {tab === "data" && <DataExport />}
    </Shell>
  );
}

function Overview() {
  const [gens, setGens] = useState<GenerationRow[] | null>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvpTotal, setRsvpTotal] = useState(0);
  const [range, setRange] = useState<7 | 30 | 365>(30);

  useEffect(() => {
    const since = toISO(addDays(todayIST(), -range));
    Promise.all([
      sb().from("generations").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
      sb().from("profiles").select("*"),
      sb().from("events").select("*").gte("event_date", since),
      sb().from("rsvps").select("id, guests, status, created_at").gte("created_at", since),
    ]).then(([g, p, e, r]) => {
      setGens((g.data as GenerationRow[]) ?? []);
      setPeople((p.data as Profile[]) ?? []);
      setEvents((e.data as EventRow[]) ?? []);
      setRsvpTotal(((r.data as RsvpRow[]) ?? []).filter((x) => x.status === "confirmed").reduce((a, b) => a + b.guests, 0));
    });
  }, [range]);

  const stats = useMemo(() => {
    const g = gens ?? [];
    const images = g.filter((x) => x.kind !== "caption_ai").reduce((a, b) => a + (b.count || 1), 0);
    const by = (f: (x: GenerationRow) => string) => {
      const m = new Map<string, number>();
      g.filter((x) => x.kind !== "caption_ai").forEach((x) => m.set(f(x), (m.get(f(x)) ?? 0) + (x.count || 1)));
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      images,
      ai: g.filter((x) => x.kind === "caption_ai").length,
      byUser: by((x) => x.user_id ?? "?"),
      byKind: by((x) => x.kind),
      byAction: by((x) => x.action),
      byLoc: by((x) => x.location ?? "?"),
    };
  }, [gens]);

  const name = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? p.full_name || p.email : "Unknown";
  };
  const kindName: Record<string, string> = { event_poster: "Event posters", location_calendar: "Location calendars", joint_calendar: "Joint calendars" };
  const actionName: Record<string, string> = { download: "Single downloads", zip: "In ZIPs", share: "Shared", whatsapp: "Sent to WhatsApp" };
  const locName: Record<string, string> = { goa: "Goa", dharamkot: "Dharamkot", both: "Both (joint)" };

  if (!gens) return <p className="text-mute">Loading…</p>;
  const Bars = ({ rows, label }: { rows: [string, number][]; label: (k: string) => string }) => {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return (
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-mute">Nothing yet.</p>}
        {rows.map(([k, v]) => (
          <div key={k} className="text-sm">
            <div className="flex justify-between">
              <span>{label(k)}</span>
              <span className="font-semibold">{v}</span>
            </div>
            <div className="h-2 rounded-full bg-ground mt-1">
              <div className="h-2 rounded-full bg-moss" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {([7, 30, 365] as const).map((r) => (
          <button key={r} className={`chip ${range === r ? "chip-on" : ""}`} onClick={() => setRange(r)}>
            Last {r === 365 ? "year" : `${r} days`}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Posters made" value={stats.images} sub="Downloaded, zipped or shared" />
        <Stat label="AI captions" value={stats.ai} sub="Gemini rewrites" />
        <Stat label="Events" value={events.length} sub={`${events.filter((e) => e.location === "goa").length} Goa · ${events.filter((e) => e.location === "dharamkot").length} Dharamkot`} />
        <Stat label="People RSVP'd" value={rsvpTotal} sub="Confirmed, incl. guests" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">By person</h2>
          <Bars rows={stats.byUser} label={name} />
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">By kind</h2>
          <Bars rows={stats.byKind} label={(k) => kindName[k] ?? k} />
          <h2 className="font-semibold mb-3 mt-5">By location</h2>
          <Bars rows={stats.byLoc} label={(k) => locName[k] ?? k} />
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">How they were used</h2>
          <Bars rows={stats.byAction} label={(k) => actionName[k] ?? k} />
        </div>
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Recent activity</h2>
        <ul className="text-sm divide-y divide-line">
          {gens.slice(0, 25).map((g) => (
            <li key={g.id} className="py-2 flex flex-wrap gap-x-3">
              <span className="text-mute w-36">{new Date(g.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</span>
              <span className="font-medium">{name(g.user_id ?? "")}</span>
              <span>
                {g.kind === "caption_ai" ? "wrote AI captions" : `${actionName[g.action]?.toLowerCase() ?? g.action}: ${kindName[g.kind]?.toLowerCase() ?? g.kind}`}
                {g.size ? ` (${g.size})` : ""} {g.location ? `· ${locName[g.location] ?? g.location}` : ""}
              </span>
            </li>
          ))}
          {gens.length === 0 && <li className="py-2 text-mute">No posters made in this period yet.</li>}
        </ul>
      </div>
    </div>
  );
}

interface Invite {
  email: string;
  role: "manager" | "admin";
  location: "goa" | "dharamkot" | null;
  created_at: string;
}

function inviteMessage(email: string) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  return `Hi! You've been added to the NomadGao Events Studio, where we make our weekly event posters and captions.\n\nOpen ${url} and click "Continue with Google" using ${email}. You'll go straight in.`;
}

function AddPerson({ onDone, people }: { onDone: () => void; people: Profile[] }) {
  const { session } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "admin">("manager");
  const [location, setLocation] = useState<"" | "goa" | "dharamkot">("");
  const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return toast("That doesn't look like an email address.", "err");
    setBusy(true);
    const existing = people.find((p) => p.email.toLowerCase() === em);
    const { error } = existing
      ? await sb().from("profiles").update({ role, location: location || null }).eq("id", existing.id)
      : await sb().from("invites").upsert({ email: em, role, location: location || null, invited_by: session?.user.id });
    setBusy(false);
    if (error) {
      if (/invites/.test(error.message) && /(find|exist)/i.test(error.message)) toast("One-time setup needed: run supabase/migrations/002_invites.sql in Supabase → SQL Editor.", "err");
      else toast(error.message, "err");
      return;
    }
    if (existing) toast(`${existing.full_name || em} now has access`);
    else {
      await copyText(inviteMessage(em));
      toast("Added. The invite message is copied, so paste it to them on WhatsApp.");
    }
    setEmail("");
    onDone();
  }
  return (
    <form onSubmit={add} className="card p-4 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[220px]">
        <label className="label" htmlFor="inv-email">Add a person</label>
        <input id="inv-email" type="email" className="input" placeholder="their Google / Gmail address" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="inv-role">Access</label>
        <select id="inv-role" className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value as "manager" | "admin")}>
          <option value="manager">Community manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="inv-loc">Location</label>
        <select id="inv-loc" className="input !w-auto" value={location} onChange={(e) => setLocation(e.target.value as "" | "goa" | "dharamkot")}>
          <option value="">Both</option>
          <option value="goa">Goa</option>
          <option value="dharamkot">Dharamkot</option>
        </select>
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add person"}</button>
      <p className="hint w-full !mt-0">They&apos;re approved automatically the first time they sign in with this email.</p>
    </form>
  );
}

function People() {
  const { session } = useAuth();
  const toast = useToast();
  const [people, setPeople] = useState<Profile[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const load = useCallback(() => {
    sb().from("profiles").select("*").order("created_at").then(({ data }) => setPeople((data as Profile[]) ?? []));
    sb().from("invites").select("*").order("created_at").then(({ data }) => setInvites((data as Invite[]) ?? []));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function update(p: Profile, patch: Partial<Profile>) {
    if (p.id === session?.user.id && patch.role && patch.role !== "admin") {
      if (!confirm("You're removing your own admin access. Continue?")) return;
    }
    const { error } = await sb().from("profiles").update(patch).eq("id", p.id);
    if (error) toast(error.message, "err");
    else {
      toast("Saved");
      load();
    }
  }
  if (!people) return <p className="text-mute">Loading…</p>;
  const pending = people.filter((p) => p.role === "pending");
  async function removeInvite(email: string) {
    const { error } = await sb().from("invites").delete().eq("email", email);
    if (error) toast(error.message, "err");
    else load();
  }
  return (
    <div className="space-y-4">
      <AddPerson onDone={load} people={people} />
      {invites.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold mb-2">Invited, not signed in yet</h2>
          <ul className="divide-y divide-line text-sm">
            {invites.map((i) => (
              <li key={i.email} className="py-2 flex flex-wrap items-center gap-3">
                <span className="font-medium mr-auto">{i.email}</span>
                <span className="text-mute">{i.role === "admin" ? "Admin" : "Community manager"} · {i.location === "goa" ? "Goa" : i.location === "dharamkot" ? "Dharamkot" : "Both"}</span>
                <button className="btn-ghost btn-sm" onClick={() => copyText(inviteMessage(i.email)).then(() => toast("Invite message copied"))}>Copy invite</button>
                <button className="btn-ghost btn-sm" onClick={() => removeInvite(i.email)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pending.length > 0 && (
        <div className="card p-4 border-saffron bg-notice">
          <h2 className="font-semibold">{pending.length} waiting for approval</h2>
          <p className="text-sm text-mute">Set them to Community manager (or Admin) and pick their location.</p>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-mute">
            <tr className="border-b border-line">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Access</th>
              <th className="p-3">Location</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="p-3 font-medium">{p.full_name}</td>
                <td className="p-3">{p.email}</td>
                <td className="p-3">
                  <select className="input !w-auto !py-1.5" value={p.role} onChange={(e) => update(p, { role: e.target.value as Profile["role"] })}>
                    <option value="pending">Waiting for approval</option>
                    <option value="manager">Community manager</option>
                    <option value="admin">Admin</option>
                    <option value="disabled">No access</option>
                  </select>
                </td>
                <td className="p-3">
                  <select className="input !w-auto !py-1.5" value={p.location ?? ""} onChange={(e) => update(p, { location: (e.target.value || null) as Profile["location"] })}>
                    <option value="">Both</option>
                    <option value="goa">Goa</option>
                    <option value="dharamkot">Dharamkot</option>
                  </select>
                </td>
                <td className="p-3 text-mute">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Community managers can add events, upload photos and make posters and captions. Admins can also see these stats, RSVPs and exports, and manage access. Location sets their default in forms.</p>
    </div>
  );
}

function Rsvps() {
  const toast = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sel, setSel] = useState<string>("");
  const [rows, setRows] = useState<RsvpRow[] | null>(null);
  useEffect(() => {
    sb()
      .from("events")
      .select("*")
      .eq("rsvp_mode", "form")
      .gte("event_date", toISO(addDays(todayIST(), -60)))
      .order("event_date", { ascending: false })
      .then(({ data }) => {
        const list = (data as EventRow[]) ?? [];
        setEvents(list);
        const upcoming = [...list].reverse().find((e) => e.event_date >= toISO(todayIST()));
        setSel((upcoming ?? list[0])?.id ?? "");
      });
  }, []);
  const load = useCallback(() => {
    if (!sel) return setRows([]);
    sb().from("rsvps").select("*").eq("event_id", sel).order("created_at").then(({ data }) => setRows((data as RsvpRow[]) ?? []));
  }, [sel]);
  useEffect(() => {
    load();
  }, [load]);
  const ev = events.find((e) => e.id === sel);
  const going = (rows ?? []).filter((r) => r.status === "confirmed").reduce((a, b) => a + b.guests, 0);

  async function setStatus(r: RsvpRow, status: RsvpRow["status"]) {
    const { error } = await sb().from("rsvps").update({ status }).eq("id", r.id);
    if (error) toast(error.message, "err");
    else load();
  }

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="card p-6 text-mute">No events use the built-in RSVP form yet. Choose &quot;Our RSVP form&quot; when adding an event.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <select className="input !w-auto" value={sel} onChange={(e) => setSel(e.target.value)}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {dayName(e.event_date, true)} {dateShort(e.event_date)} · {LOCATIONS[e.location].name} · {e.name}
                </option>
              ))}
            </select>
            {ev && (
              <span className="text-sm">
                <b>{going}</b>
                {ev.capacity ? ` / ${ev.capacity}` : ""} going
              </span>
            )}
            <button
              className="btn-ghost btn-sm ml-auto"
              disabled={!rows?.length}
              onClick={() =>
                saveCsv(
                  (rows ?? []).map((r) => ({ name: r.name, phone: r.phone, email: r.email, guests: r.guests, staying_with_us: r.staying_with_us ? "yes" : "no", status: r.status, note: r.note, rsvp_at: r.created_at })),
                  `rsvps-${ev?.name ?? "event"}.csv`
                )
              }
            >
              Download CSV
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-mute">
                <tr className="border-b border-line">
                  <th className="p-3">Name</th>
                  <th className="p-3">WhatsApp</th>
                  <th className="p-3">People</th>
                  <th className="p-3">Staying with us</th>
                  <th className="p-3">Note</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="p-3 font-medium">
                      {r.name}
                      {r.email && <div className="text-mute font-normal">{r.email}</div>}
                    </td>
                    <td className="p-3">
                      <a className="underline" href={`https://wa.me/${r.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
                        {r.phone}
                      </a>
                    </td>
                    <td className="p-3">{r.guests}</td>
                    <td className="p-3">{r.staying_with_us ? "Yes" : "No"}</td>
                    <td className="p-3 text-mute">{r.note}</td>
                    <td className="p-3">
                      <select className="input !w-auto !py-1" value={r.status} onChange={(e) => setStatus(r, e.target.value as RsvpRow["status"])}>
                        <option value="confirmed">Going</option>
                        <option value="waitlist">Waitlist</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {rows && rows.length === 0 && (
                  <tr>
                    <td className="p-4 text-mute" colSpan={6}>
                      No RSVPs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function DataExport() {
  const toast = useToast();
  const [from, setFrom] = useState(toISO(addDays(todayIST(), -90)));
  const [to, setTo] = useState(toISO(addDays(todayIST(), 60)));
  async function exportEvents() {
    const [{ data, error }, { data: p }] = await Promise.all([sb().from("events").select("*").gte("event_date", from).lte("event_date", to).order("event_date"), sb().from("profiles").select("id, full_name, email")]);
    if (error) return toast(error.message, "err");
    const names = Object.fromEntries(((p as Profile[]) ?? []).map((x) => [x.id, x.full_name || x.email]));
    saveCsv(
      ((data as EventRow[]) ?? []).map((e) => ({
        date: e.event_date,
        day: dayName(e.event_date),
        start: e.start_time,
        end: e.end_time,
        location: LOCATIONS[e.location].name,
        brands: e.brands,
        name: e.name,
        type: eventType(e.event_type).name,
        venue: e.venue,
        spot: e.spot,
        fee: e.fee_type,
        fee_amount: e.fee_amount,
        fee_note: e.fee_note,
        rsvp: e.rsvp_mode,
        rsvp_link: e.rsvp_link,
        rsvp_phone: e.rsvp_phone,
        host: e.host,
        description: e.description,
        bring: e.what_to_bring,
        limited_seats: e.limited_seats ? e.capacity ?? "yes" : "",
        byob: e.byob ? "yes" : "",
        audience: e.audience,
        added_by: e.created_by ? names[e.created_by] : "",
      })),
      `events-${from}-to-${to}.csv`
    );
  }
  async function exportRsvps() {
    const { data, error } = await sb().from("rsvps").select("*, events(name, event_date, location)").gte("created_at", from).order("created_at");
    if (error) return toast(error.message, "err");
    saveCsv(
      ((data as (RsvpRow & { events: { name: string; event_date: string; location: string } })[]) ?? []).map((r) => ({
        event: r.events?.name,
        event_date: r.events?.event_date,
        location: r.events?.location,
        name: r.name,
        phone: r.phone,
        email: r.email,
        guests: r.guests,
        staying_with_us: r.staying_with_us ? "yes" : "no",
        status: r.status,
        note: r.note,
        rsvp_at: r.created_at,
      })),
      `rsvps-since-${from}.csv`
    );
  }
  return (
    <div className="card p-5 space-y-4 max-w-xl">
      <p className="text-sm text-mute">Download everything the team filled in, to open in Excel or Google Sheets.</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="btn-primary" onClick={exportEvents}>Download events CSV</button>
        <button className="btn-ghost" onClick={exportRsvps}>Download RSVPs CSV</button>
      </div>
    </div>
  );
}
