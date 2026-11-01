"use client";
import { useState } from "react";
import { BRANDS, EVENT_TYPES, LOCATIONS, eventType, type BrandId, type LocationId } from "@/lib/constants";
import { dayName } from "@/lib/format";
import type { Draft, ImportContext } from "@/lib/importer";
import { recheck } from "@/lib/importer";
import type { FeeType, RsvpMode } from "@/lib/types";

const border = (d: Draft, field: string) => {
  const i = d.issues.find((x) => x.field === field);
  return i ? (i.level === "error" ? "!border-chili ring-2 ring-chili/20" : "!border-saffron ring-2 ring-saffron/20") : "";
};

function F({ label, w, grow, children }: { label: string; w: number; grow?: boolean; children: React.ReactNode }) {
  return (
    <label className="block min-w-0" style={{ flex: grow ? `1 1 ${w}px` : `0 0 ${w}px` }}>
      <span className="block text-[11px] font-semibold text-mute mb-0.5">{label}</span>
      {children}
    </label>
  );
}

function Row({ d, ctx, onChange, onRemove }: { d: Draft; ctx: ImportContext; onChange: (d: Draft) => void; onRemove: () => void }) {
  const [more, setMore] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    const next = { ...d, [k]: v } as Draft;
    if (k === "location") next.venue = LOCATIONS[v as LocationId].venues[0];
    next.issues = recheck(next, ctx);
    onChange(next);
  };
  const toggleBrand = (b: BrandId) => {
    const has = d.brands.includes(b);
    const next = has ? d.brands.filter((x) => x !== b) : [...d.brands, b];
    if (next.length) set("brands", next);
  };
  const known = EVENT_TYPES.some((t) => t.slug === d.event_type);
  return (
    <div className={`card p-3 ${d.include ? "" : "opacity-60"}`}>
      <div className="flex gap-3">
        <label className="pt-6 flex justify-center w-6 shrink-0">
          <input type="checkbox" className="h-4 w-4" checked={d.include} onChange={(e) => onChange({ ...d, include: e.target.checked })} aria-label="Include this event" />
        </label>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
          <F label="Event" w={240} grow>
            <input className={`input !py-2 font-semibold ${border(d, "name")}`} value={d.name} placeholder="Event name" onChange={(e) => set("name", e.target.value)} />
          </F>
          <F label="Type" w={190}>
            <select className="input !py-2" value={known ? d.event_type : "other"} onChange={(e) => set("event_type", e.target.value)}>
              {EVENT_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.emoji} {t.name}
                </option>
              ))}
            </select>
          </F>
          <F label="Location" w={140}>
            <select className={`input !py-2 !px-2 ${border(d, "location")}`} value={d.location} onChange={(e) => set("location", e.target.value as LocationId)}>
              <option value="goa">Goa</option>
              <option value="dharamkot">Dharamkot</option>
            </select>
          </F>
          <F label={d.event_date ? `Date · ${dayName(d.event_date)}` : "Date"} w={175}>
            <input type="date" className={`input !py-2 ${border(d, "event_date")}`} value={d.event_date} onChange={(e) => set("event_date", e.target.value)} />
          </F>
          <F label="Starts" w={140}>
            <input type="time" className={`input !py-2 !px-2 ${border(d, "start_time")}`} value={d.start_time?.slice(0, 5) ?? ""} onChange={(e) => set("start_time", e.target.value || null)} />
          </F>
          <F label="Ends" w={140}>
            <input type="time" className="input !py-2 !px-2" value={d.end_time?.slice(0, 5) ?? ""} onChange={(e) => set("end_time", e.target.value || null)} />
          </F>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
          <F label="Venue" w={240} grow>
            <input className={`input !py-2 ${border(d, "venue")}`} value={d.venue ?? ""} onChange={(e) => set("venue", e.target.value)} list={`venues-${d.location}`} />
          </F>
          <F label="Entry" w={270}>
            <div className="flex gap-1">
              <select className={`input !py-2 !px-2 ${border(d, "fee_type")}`} value={d.fee_type} onChange={(e) => set("fee_type", e.target.value as FeeType)}>
                <option value="free">Free</option>
                <option value="paid">Paid ₹</option>
                <option value="pwyw">Pay what you feel</option>
                <option value="custom">Other</option>
              </select>
              {d.fee_type === "paid" && <input type="number" min={0} className="input !py-2 !px-2 !w-24" value={d.fee_amount ?? ""} onChange={(e) => set("fee_amount", e.target.value ? Number(e.target.value) : null)} aria-label="Amount in rupees" />}
            </div>
          </F>
          <F label="RSVP" w={300}>
            <div className="flex gap-1">
              <select className={`input !py-2 !px-2 ${border(d, "rsvp_mode")}`} value={d.rsvp_mode} onChange={(e) => set("rsvp_mode", e.target.value as RsvpMode)}>
                <option value="none">Walk in</option>
                <option value="form">Our RSVP form</option>
                <option value="link">Link</option>
                <option value="phone">WhatsApp</option>
              </select>
              {d.rsvp_mode === "link" && <input className="input !py-2" placeholder="https://…" value={d.rsvp_link ?? ""} onChange={(e) => set("rsvp_link", e.target.value || null)} aria-label="RSVP link" />}
              {d.rsvp_mode === "phone" && <input className="input !py-2" placeholder="+91…" value={d.rsvp_phone ?? ""} onChange={(e) => set("rsvp_phone", e.target.value || null)} aria-label="WhatsApp number" />}
            </div>
          </F>
          <div className="flex gap-1 justify-end ml-auto">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setMore((x) => !x)} aria-expanded={more}>
              {more ? "Fewer details" : "More details"}
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={onRemove} aria-label="Remove this event">
              Remove
            </button>
          </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2 ml-9">
        {(Object.keys(BRANDS) as BrandId[]).map((b) => (
          <button key={b} type="button" className={`chip !py-0.5 !text-xs ${d.brands.includes(b) ? "chip-on" : ""}`} onClick={() => toggleBrand(b)}>
            {BRANDS[b].name}
          </button>
        ))}
        {d.duplicateOf && <span className="rounded-full bg-ink text-white text-xs px-2 py-0.5">Already in the calendar</span>}
        {d.issues.map((i, k) => (
          <span key={k} className={`rounded-full text-xs px-2 py-0.5 ${i.level === "error" ? "bg-chili text-white" : "bg-[#fbe7c6] text-[#6b4210]"}`}>
            {i.msg}
          </span>
        ))}
      </div>

      {more && (
        <div className="grid sm:grid-cols-3 gap-3 mt-3 ml-9">
          <div>
            <label className="label !text-xs">Host</label>
            <input className="input !py-2" value={d.host ?? ""} onChange={(e) => set("host", e.target.value || null)} />
          </div>
          <div>
            <label className="label !text-xs">Spot</label>
            <input className="input !py-2" value={d.spot ?? ""} onChange={(e) => set("spot", e.target.value || null)} />
          </div>
          <div>
            <label className="label !text-xs">Fee note</label>
            <input className="input !py-2" value={d.fee_note ?? ""} onChange={(e) => set("fee_note", e.target.value || null)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label !text-xs">Short description</label>
            <input className="input !py-2" maxLength={160} value={d.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
          </div>
          <div>
            <label className="label !text-xs">What to bring</label>
            <input className="input !py-2" value={d.what_to_bring ?? ""} onChange={(e) => set("what_to_bring", e.target.value || null)} />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={d.limited_seats} onChange={(e) => set("limited_seats", e.target.checked)} /> Limited seats
            </label>
            {d.limited_seats && <input type="number" min={1} className="input !py-1.5 !w-20" value={d.capacity ?? ""} onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : null)} aria-label="Seats" />}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.byob} onChange={(e) => set("byob", e.target.checked)} /> BYOB
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.audience === "residents"} onChange={(e) => set("audience", e.target.checked ? "residents" : "open")} /> Residents only
          </label>
        </div>
      )}
    </div>
  );
}

export function ImportReview({ drafts, ctx, onChange, onSave, saving }: { drafts: Draft[]; ctx: ImportContext; onChange: (d: Draft[]) => void; onSave: () => void; saving: boolean }) {
  const selected = drafts.filter((d) => d.include);
  const blocked = selected.filter((d) => d.issues.some((i) => i.level === "error"));
  const checks = selected.reduce((n, d) => n + d.issues.filter((i) => i.level === "check").length, 0);
  return (
    <section className="space-y-3">
      <datalist id="venues-goa">{LOCATIONS.goa.venues.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="venues-dharamkot">{LOCATIONS.dharamkot.venues.map((v) => <option key={v} value={v} />)}</datalist>
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="font-display text-2xl font-extrabold">Check before adding</h2>
          <p className="text-sm text-mute">
            {drafts.length} event{drafts.length === 1 ? "" : "s"} found. Red needs fixing, yellow is worth a look. Untick anything you don&apos;t want.
          </p>
        </div>
        <button className="btn-ghost" onClick={() => onChange([])}>
          Clear all
        </button>
      </div>
      <div className="space-y-2">
          {drafts.map((d, i) => (
            <Row
              key={d.key}
              d={d}
              ctx={ctx}
              onChange={(nd) => onChange(drafts.map((x, j) => (j === i ? nd : x)))}
              onRemove={() => onChange(drafts.filter((_, j) => j !== i))}
            />
          ))}
      </div>
      <div className="sticky bottom-0 bg-ground/95 backdrop-blur py-4 border-t border-line flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={saving || !selected.length || blocked.length > 0} onClick={onSave}>
          {saving ? "Adding…" : `Add ${selected.length} event${selected.length === 1 ? "" : "s"}`}
        </button>
        {blocked.length > 0 && <span className="text-sm text-chili">Fix the red fields on {blocked.length} event{blocked.length === 1 ? "" : "s"} first, or untick them.</span>}
        {!blocked.length && checks > 0 && <span className="text-sm text-mute">{checks} yellow note{checks === 1 ? "" : "s"} to glance at. You can still add.</span>}
        <span className="text-sm text-mute ml-auto">Types: {[...new Set(selected.map((d) => eventType(d.event_type).emoji))].join(" ")}</span>
      </div>
    </section>
  );
}
