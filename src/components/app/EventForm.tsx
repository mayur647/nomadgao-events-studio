"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BRANDS, EVENT_TYPES, LOCATIONS, slugify, type BrandId, type LocationId } from "@/lib/constants";
import { addDays, dayName, toISO, todayIST, weekStart } from "@/lib/format";
import { publicUrl, sb } from "@/lib/supabase";
import { compressImage } from "@/lib/export";
import type { EventInput, EventRow, FeeType, RsvpMode } from "@/lib/types";
import { useAuth } from "./Auth";
import { useToast } from "./Toast";

function blank(location: LocationId): EventInput {
  const nextWeek = toISO(addDays(weekStart(todayIST()), 7 + 3));
  return {
    location,
    brands: ["nomadgao"],
    name: "",
    event_type: "game-night",
    event_date: nextWeek,
    start_time: "19:00",
    end_time: null,
    venue: LOCATIONS[location].venues[0],
    spot: null,
    fee_type: "free",
    fee_amount: null,
    fee_note: null,
    rsvp_mode: "none",
    rsvp_link: null,
    rsvp_phone: null,
    show_qr: true,
    host: null,
    description: null,
    what_to_bring: null,
    limited_seats: false,
    capacity: null,
    byob: false,
    audience: "open",
    photo_path: null,
  };
}

function Chips<T extends string>({ value, options, onChange, name }: { value: T; options: [T, string][]; onChange: (v: T) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map(([v, l]) => (
        <button type="button" role="radio" aria-checked={value === v} key={v} className={`chip ${value === v ? "chip-on" : ""}`} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-xl font-extrabold">{title}</h2>
        {hint && <p className="hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function EventForm({ existing, copyFrom }: { existing?: EventRow; copyFrom?: EventRow }) {
  const { profile, session } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const startLoc: LocationId = existing?.location ?? copyFrom?.location ?? profile?.location ?? "goa";
  const [f, setF] = useState<EventInput>(() => {
    const src = existing ?? copyFrom;
    if (!src) return blank(startLoc);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_by, created_at, updated_at, ...rest } = src;
    const r = { ...rest, start_time: rest.start_time?.slice(0, 5) ?? null, end_time: rest.end_time?.slice(0, 5) ?? null };
    if (copyFrom && !existing) r.event_date = toISO(addDays(new Date(rest.event_date + "T00:00:00"), 7));
    return r;
  });
  const known = EVENT_TYPES.some((t) => t.slug === f.event_type);
  const [customType, setCustomType] = useState(known ? "" : f.event_type.replace(/-/g, " "));
  const [typeSel, setTypeSel] = useState(known ? f.event_type : "__custom");
  const [venueSel, setVenueSel] = useState(LOCATIONS[f.location].venues.includes(f.venue ?? "") ? f.venue! : "__custom");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (typeSel === "__custom") set("event_type", slugify(customType) || "other");
    else set("event_type", typeSel);
  }, [typeSel, customType]);

  function changeLocation(loc: LocationId) {
    setF((x) => ({ ...x, location: loc, venue: LOCATIONS[loc].venues[0] }));
    setVenueSel(LOCATIONS[loc].venues[0]);
  }
  function changeVenue(v: string) {
    setVenueSel(v);
    if (v !== "__custom") {
      set("venue", v);
      if (v.includes("Hotpot") && !f.brands.includes("hotpot")) set("brands", [...f.brands, "hotpot"]);
    } else set("venue", "");
  }
  function toggleBrand(b: BrandId) {
    const has = f.brands.includes(b);
    const next = has ? f.brands.filter((x) => x !== b) : [...f.brands, b];
    if (next.length) set("brands", next.sort((a, b) => (a === "hotpot" ? -1 : b === "hotpot" ? 1 : 0)));
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `events/${crypto.randomUUID()}.jpg`;
      const { error } = await sb().storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      set("photo_path", path);
    } catch (e) {
      toast(`Photo upload failed: ${(e as Error).message}`, "err");
    } finally {
      setUploading(false);
    }
  }

  async function save(another: boolean) {
    if (!f.name.trim()) return toast("Give the event a name.", "err");
    if (f.fee_type === "paid" && !f.fee_amount) return toast("Add the entry fee amount, or choose Free.", "err");
    if (f.rsvp_mode === "link" && !f.rsvp_link) return toast("Paste the RSVP link, or pick another RSVP option.", "err");
    if (f.rsvp_mode === "phone" && !f.rsvp_phone) return toast("Add the WhatsApp number for RSVPs.", "err");
    if (f.limited_seats && !f.capacity) return toast("How many seats are there?", "err");
    setBusy(true);
    const payload = {
      ...f,
      name: f.name.trim(),
      start_time: f.start_time || null,
      end_time: f.end_time || null,
      fee_amount: f.fee_type === "paid" ? f.fee_amount : null,
      capacity: f.limited_seats ? f.capacity : null,
      rsvp_link: f.rsvp_mode === "link" ? f.rsvp_link : null,
      rsvp_phone: f.rsvp_mode === "phone" ? f.rsvp_phone : null,
      show_qr: f.rsvp_mode === "none" ? false : f.show_qr,
      updated_at: new Date().toISOString(),
    };
    const q = existing
      ? sb().from("events").update(payload).eq("id", existing.id).select().single()
      : sb().from("events").insert({ ...payload, created_by: session?.user.id }).select().single();
    const { data, error } = await q;
    setBusy(false);
    if (error) return toast(error.message, "err");
    toast(existing ? "Event updated" : "Event saved");
    const wk = toISO(weekStart(new Date((data as EventRow).event_date + "T00:00:00")));
    if (another) {
      setF({ ...blank(f.location), event_date: f.event_date, brands: f.brands });
      setTypeSel("game-night");
      setCustomType("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else router.push(`/events?week=${wk}`);
  }

  const photo = publicUrl(f.photo_path);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
    >
      <Section title="Where and who">
        <div>
          <span className="label">Location</span>
          <Chips name="Location" value={f.location} onChange={changeLocation} options={[["goa", "🌴 Goa · Anjuna"], ["dharamkot", "🏔️ Dharamkot"]]} />
        </div>
        <div>
          <span className="label">Brands on the poster</span>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(BRANDS) as BrandId[]).map((b) => (
              <label key={b} className={`chip ${f.brands.includes(b) ? "chip-on" : ""}`}>
                <input type="checkbox" className="sr-only" checked={f.brands.includes(b)} onChange={() => toggleBrand(b)} />
                {f.brands.includes(b) ? "✓ " : ""}
                {BRANDS[b].name}
              </label>
            ))}
          </div>
          <p className="hint">Tick both for a co-branded poster.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="venue">Venue</label>
            <select id="venue" className="input" value={venueSel} onChange={(e) => changeVenue(e.target.value)}>
              {LOCATIONS[f.location].venues.map((v) => (
                <option key={v}>{v}</option>
              ))}
              <option value="__custom">Somewhere else…</option>
            </select>
            {venueSel === "__custom" && <input className="input mt-2" placeholder="e.g. Meet at Bhagsu waterfall" value={f.venue ?? ""} onChange={(e) => set("venue", e.target.value)} />}
          </div>
          <div>
            <label className="label" htmlFor="spot">Spot (optional)</label>
            <input id="spot" className="input" placeholder="Rooftop, garden, coworking hall…" value={f.spot ?? ""} onChange={(e) => set("spot", e.target.value || null)} />
          </div>
        </div>
      </Section>

      <Section title="The event">
        <div>
          <label className="label" htmlFor="name">Event name</label>
          <input id="name" className="input text-lg" placeholder="e.g. Sunset Sip & Paint" maxLength={60} value={f.name} onChange={(e) => set("name", e.target.value)} required />
          <p className="hint">Short names look best on posters. {60 - f.name.length} characters left.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" className="input" value={typeSel} onChange={(e) => setTypeSel(e.target.value)}>
              {EVENT_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.emoji} {t.name}
                </option>
              ))}
              <option value="__custom">✏️ Something else…</option>
            </select>
            {typeSel === "__custom" && <input className="input mt-2" placeholder="e.g. Pottery" value={customType} onChange={(e) => setCustomType(e.target.value)} />}
            <p className="hint">The type decides which gallery photos the poster uses.</p>
          </div>
          <div>
            <label className="label" htmlFor="host">Host (optional)</label>
            <input id="host" className="input" placeholder="e.g. Chef Tenzin" value={f.host ?? ""} onChange={(e) => set("host", e.target.value || null)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="desc">Short description</label>
          <textarea id="desc" className="input" rows={2} maxLength={160} placeholder="One line about what people will actually do. This shapes the caption." value={f.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
          <p className="hint">{160 - (f.description?.length ?? 0)} characters left.</p>
        </div>
        <div>
          <label className="label" htmlFor="bring">What to bring (optional)</label>
          <input id="bring" className="input" placeholder="Water, a jacket, your favourite board game…" value={f.what_to_bring ?? ""} onChange={(e) => set("what_to_bring", e.target.value || null)} />
        </div>
      </Section>

      <Section title="When">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} required />
            <p className="hint font-semibold text-moss">{f.event_date ? dayName(f.event_date) : ""}</p>
          </div>
          <div>
            <label className="label" htmlFor="st">Starts</label>
            <input id="st" type="time" className="input" value={f.start_time ?? ""} onChange={(e) => set("start_time", e.target.value || null)} />
          </div>
          <div>
            <label className="label" htmlFor="et">Ends (optional)</label>
            <input id="et" type="time" className="input" value={f.end_time ?? ""} onChange={(e) => set("end_time", e.target.value || null)} />
          </div>
        </div>
      </Section>

      <Section title="Entry and RSVP">
        <div>
          <span className="label">Entry fee</span>
          <Chips<FeeType> name="Entry fee" value={f.fee_type} onChange={(v) => set("fee_type", v)} options={[["free", "Free"], ["paid", "Paid"], ["pwyw", "Pay what you feel"], ["custom", "Other"]]} />
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            {f.fee_type === "paid" && (
              <div>
                <label className="label" htmlFor="amt">Amount (₹)</label>
                <input id="amt" type="number" min={0} className="input" value={f.fee_amount ?? ""} onChange={(e) => set("fee_amount", e.target.value ? Number(e.target.value) : null)} />
              </div>
            )}
            <div className={f.fee_type === "paid" ? "" : "sm:col-span-2"}>
              <label className="label" htmlFor="fnote">{f.fee_type === "custom" ? "Describe the entry" : "Fee note (optional)"}</label>
              <input id="fnote" className="input" placeholder={f.fee_type === "custom" ? "e.g. ₹300 cover, redeemable on food" : "e.g. includes a drink"} value={f.fee_note ?? ""} onChange={(e) => set("fee_note", e.target.value || null)} />
            </div>
          </div>
        </div>
        <div>
          <span className="label">RSVP</span>
          <Chips<RsvpMode>
            name="RSVP"
            value={f.rsvp_mode}
            onChange={(v) => set("rsvp_mode", v)}
            options={[["none", "Not needed (walk in)"], ["form", "Our RSVP form"], ["link", "Another link"], ["phone", "WhatsApp number"]]}
          />
          {f.rsvp_mode === "form" && <p className="hint">The app makes an RSVP page for this event. Replies show up in Admin.</p>}
          {f.rsvp_mode === "link" && <input className="input mt-3" placeholder="https://…" value={f.rsvp_link ?? ""} onChange={(e) => set("rsvp_link", e.target.value || null)} />}
          {f.rsvp_mode === "phone" && <input className="input mt-3" inputMode="tel" placeholder="+91 …" value={f.rsvp_phone ?? ""} onChange={(e) => set("rsvp_phone", e.target.value || null)} />}
          {f.rsvp_mode !== "none" && (
            <label className="flex items-center gap-2 mt-3 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={f.show_qr} onChange={(e) => set("show_qr", e.target.checked)} /> Put an RSVP QR code on the poster
            </label>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4" checked={f.limited_seats} onChange={(e) => set("limited_seats", e.target.checked)} /> Limited seats
            </label>
            {f.limited_seats && <input type="number" min={1} className="input mt-2" placeholder="How many?" value={f.capacity ?? ""} onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)} />}
            {f.limited_seats && f.rsvp_mode === "form" && <p className="hint">When it fills up, new RSVPs go on a waitlist.</p>}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold self-start">
            <input type="checkbox" className="h-4 w-4" checked={f.byob} onChange={(e) => set("byob", e.target.checked)} /> BYOB
          </label>
        </div>
        <div>
          <span className="label">Who can come</span>
          <Chips name="Audience" value={f.audience} onChange={(v) => set("audience", v)} options={[["open", "Open to all"], ["residents", "Residents only"]]} />
        </div>
      </Section>

      <Section title="Photo (optional)" hint="Leave it empty and the poster picks a photo from the gallery for this event type, a different one each shuffle.">
        <div className="flex flex-wrap items-center gap-4">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-28 w-28 object-cover rounded-xl border border-line" />
          )}
          <label className="btn-ghost">
            {uploading ? "Uploading…" : photo ? "Replace photo" : "Upload a photo"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </label>
          {photo && (
            <button type="button" className="btn-ghost" onClick={() => set("photo_path", null)}>
              Remove
            </button>
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 bg-ground/95 backdrop-blur py-4 flex flex-wrap gap-3 border-t border-line">
        <button className="btn-primary" disabled={busy || uploading}>
          {busy ? "Saving…" : existing ? "Save changes" : "Save event"}
        </button>
        {!existing && (
          <button type="button" className="btn-ghost" disabled={busy || uploading} onClick={() => save(true)}>
            Save and add another
          </button>
        )}
        <button type="button" className="btn-ghost ml-auto" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
