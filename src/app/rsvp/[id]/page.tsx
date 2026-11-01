"use client";
import { use, useEffect, useState } from "react";
import { isConfigured, sb } from "@/lib/supabase";
import { LOCATIONS, eventType, type BrandId, type LocationId } from "@/lib/constants";
import { PALETTES, HOTPOT_PALETTES } from "@/lib/themes";
import { dateShort, dayName, feeText, timeRange, venueLine } from "@/lib/format";
import { Scene } from "@/components/posters/Art";
import { Logos } from "@/components/posters/common";
import type { EventRow } from "@/lib/types";

type PublicEvent = Pick<
  EventRow,
  "id" | "name" | "event_type" | "location" | "brands" | "event_date" | "start_time" | "end_time" | "venue" | "spot" | "fee_type" | "fee_amount" | "fee_note" | "host" | "description" | "what_to_bring" | "byob" | "audience" | "limited_seats" | "capacity"
> & { confirmed: number };

export default function RsvpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ev, setEv] = useState<PublicEvent | null | undefined>(undefined);
  const [form, setForm] = useState({ name: "", phone: "", email: "", guests: 1, staying: false, note: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) return setEv(null);
    sb()
      .rpc("get_public_event", { p_id: id })
      .then(({ data }) => setEv((data as PublicEvent) ?? null));
  }, [id]);

  if (ev === undefined) return <div className="min-h-screen grid place-items-center text-mute">Loading…</div>;
  if (ev === null)
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold">This RSVP link isn&apos;t active</h1>
          <p className="text-mute mt-2">The event may have changed. Message the team on WhatsApp or Instagram @nomad.gao.</p>
        </div>
      </main>
    );

  const loc = ev.location as LocationId;
  const brands = (ev.brands?.length ? ev.brands : ["nomadgao"]) as BrandId[];
  const pal = brands.includes("hotpot") && !brands.includes("nomadgao") ? HOTPOT_PALETTES[1] : PALETTES[loc][loc === "goa" ? 0 : 2];
  const t = eventType(ev.event_type);
  const left = ev.limited_seats && ev.capacity ? Math.max(0, ev.capacity - ev.confirmed) : null;
  const past = new Date(ev.event_date + "T23:59:59") < new Date();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { data, error } = await sb().rpc("submit_rsvp", {
      p_event: id,
      p_name: form.name,
      p_phone: form.phone,
      p_email: form.email,
      p_guests: form.guests,
      p_staying: form.staying,
      p_note: form.note,
    });
    setBusy(false);
    if (error) setErr(error.message.replace(/^.*?: /, ""));
    else setDone(data as string);
  }

  return (
    <main className="min-h-screen" style={{ background: pal.bg, color: pal.ink }}>
      <div className="mx-auto max-w-xl">
        <div className="px-5 pt-6 flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
          <Logos brands={brands} dark={pal.dark} height={24} gap={10} color={pal.ink} />
          <span className="font-hand text-xl font-bold whitespace-nowrap">{LOCATIONS[loc].place}</span>
        </div>
        <div className="overflow-hidden">
          <Scene location={loc} variant={1} pal={pal} w={576} h={230} />
        </div>
        <div className="px-5 pb-12">
          <div className="rounded-3xl p-6 sm:p-8 shadow-xl" style={{ background: pal.paper, color: pal.paperInk }}>
            <p className="text-sm font-semibold opacity-70">
              {t.emoji} {t.name}
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight mt-1">{ev.name}</h1>
            {ev.description && <p className="mt-3 opacity-85">{ev.description}</p>}
            <ul className="mt-5 space-y-1.5 text-[15px]">
              <li>🗓 {dayName(ev.event_date)}, {dateShort(ev.event_date)} {timeRange(ev) && `· ${timeRange(ev)}`}</li>
              <li>📍 {venueLine(ev)}</li>
              <li>🎟 {feeText(ev)}{ev.fee_note && ev.fee_type !== "custom" ? ` · ${ev.fee_note}` : ""}</li>
              {ev.host && <li>🙋 Hosted by {ev.host}</li>}
              {ev.what_to_bring && <li>🎒 Bring: {ev.what_to_bring}</li>}
              {ev.byob && <li>🍾 BYOB</li>}
              <li>{ev.audience === "residents" ? "🏡 For NomadGao residents" : "👋 Open to all"}</li>
            </ul>
            {left !== null && (
              <p className="mt-4 inline-block rounded-full px-3 py-1 text-sm font-bold" style={{ background: pal.accent, color: pal.onAccent }}>
                {left > 0 ? `${left} spot${left === 1 ? "" : "s"} left` : "Full. You can join the waitlist."}
              </p>
            )}

            <div className="mt-6 border-t pt-6" style={{ borderColor: `${pal.paperInk}22` }}>
              {done ? (
                <div className="text-center py-4">
                  <p className="font-hand text-4xl" style={{ color: pal.accent2 }}>{done === "waitlist" ? "you're on the waitlist" : "see you there!"}</p>
                  <p className="mt-2">
                    {done === "waitlist" ? "The event is full right now. We'll message you on WhatsApp if a spot opens up." : `Your spot for ${ev.name} is saved. We'll message you on WhatsApp if anything changes.`}
                  </p>
                </div>
              ) : past ? (
                <p>This event has already happened. Follow @nomad.gao for what&apos;s next.</p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h2 className="font-display text-2xl font-extrabold">Save your spot</h2>
                  <div>
                    <label className="label" htmlFor="n">Your name</label>
                    <input id="n" className="input" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                  </div>
                  <div>
                    <label className="label" htmlFor="p">WhatsApp number</label>
                    <input id="p" className="input" required inputMode="tel" maxLength={40} placeholder="+91 98xxx xxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
                  </div>
                  <div>
                    <label className="label" htmlFor="e">Email (optional)</label>
                    <input id="e" type="email" className="input" maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="g">How many people?</label>
                      <select id="g" className="input" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n === 1 ? "Just me" : `${n} people`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="label">Staying with us?</span>
                      <label className="flex items-center gap-2 h-[46px]">
                        <input type="checkbox" className="h-5 w-5" checked={form.staying} onChange={(e) => setForm({ ...form, staying: e.target.checked })} />
                        Yes, I&apos;m at NomadGao
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="note">Anything we should know? (optional)</label>
                    <textarea id="note" className="input" rows={2} maxLength={500} placeholder="Dietary needs, arriving late…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  </div>
                  {err && <p className="text-sm text-chili">{err}</p>}
                  <button className="btn w-full text-base py-3" style={{ background: pal.accent, color: pal.onAccent }} disabled={busy}>
                    {busy ? "Saving…" : left === 0 ? "Join the waitlist" : "RSVP"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
