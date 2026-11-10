"use client";
import type { ReactNode } from "react";
import { LOCATIONS, type LocationId, type SizeId } from "@/lib/constants";
import { hash, shuffled } from "@/lib/rng";
import type { EventRow, PhotoRow } from "@/lib/types";
import { safeName } from "@/lib/export";
import { dateShort, dayName, weekRange } from "@/lib/format";
import { toPosterEvent } from "./common";
import { MIX_CAL_TITLES, MixCalendar, type CalSection } from "./v2/MixCalendars";
import { MIX_LAYOUTS, MIX_NAMES, MixPoster } from "./v2/DirD";

export interface PosterSpec {
  key: string;
  kind: "joint" | "location" | "event";
  label: string;
  sub: string;
  location: LocationId | "both";
  event?: EventRow;
  events: EventRow[];
  template: string;
  look: string;
  fileBase: string;
  photoPath: string | null;
  render: (size: SizeId) => ReactNode;
}

/** All the photos an event could use: its own photo + the gallery for its type. */
export function photoPool(e: EventRow, photos: PhotoRow[]) {
  const pool: string[] = [];
  if (e.photo_path) pool.push(e.photo_path);
  const sameType = photos.filter((p) => p.event_type === e.event_type);
  const local = sameType.filter((p) => p.location === e.location || p.location === "any");
  for (const p of local.length ? local : sameType) pool.push(p.path);
  return pool;
}

export function buildSpecs(opts: {
  week: string;
  events: EventRow[];
  photos: PhotoRow[];
  seed: number;
  offsets: Record<string, number>;
  photoData: Record<string, string | null>;
  qrData: Record<string, string | null>;
}): PosterSpec[] {
  const { week, events, photos, seed, offsets, photoData, qrData } = opts;
  const sorted = [...events].sort((a, b) => (a.event_date + (a.start_time ?? "") + a.name).localeCompare(b.event_date + (b.start_time ?? "") + b.name));
  const specs: PosterSpec[] = [];
  const goa = sorted.filter((e) => e.location === "goa");
  const dk = sorted.filter((e) => e.location === "dharamkot");
  const range = `${dateShort(week)}`;

  // Shuffle on any card moves it to the next of the three styles; after all three, the headline (calendars) or photo (events) changes too.
  const calLayout = (key: string, off: number) => {
    const deckC = shuffled(MIX_LAYOUTS, hash(seed, "cal-deck"));
    const base = hash(seed, key) % 3;
    const n = base + off;
    const pick = offsets[`style:${key}`];
    return { layout: pick !== undefined ? MIX_LAYOUTS[pick % 3] : deckC[n % 3], title: MIX_CAL_TITLES[(hash(seed, key, "t") + Math.floor(n / 3)) % MIX_CAL_TITLES.length] };
  };

  // ── joint calendar
  if (sorted.length) {
    const { layout, title } = calLayout("joint", offsets.joint ?? 0);
    const sections: CalSection[] = [
      { loc: "goa" as LocationId, events: goa.map(toPosterEvent) },
      { loc: "dharamkot" as LocationId, events: dk.map(toPosterEvent) },
    ].filter((x) => x.events.length);
    specs.push({
      key: "joint",
      kind: "joint",
      label: "Joint weekly calendar",
      sub: "Goa + Dharamkot",
      location: "both",
      events: sorted,
      template: layout,
      look: `${MIX_NAMES[layout]} · "${title}"`,
      fileBase: `00-joint-calendar-${range.replace(" ", "")}`,
      photoPath: null,
      render: (size) => <MixCalendar layout={layout} sections={sections} range={weekRange(week)} size={size} title={title} />,
    });
  }

  // ── per-location calendars
  for (const [loc, list] of [["goa", goa], ["dharamkot", dk]] as [LocationId, EventRow[]][]) {
    if (!list.length) continue;
    const key = `cal-${loc}`;
    const { layout, title } = calLayout(key, offsets[key] ?? 0);
    const sections: CalSection[] = [{ loc, events: list.map(toPosterEvent) }];
    specs.push({
      key,
      kind: "location",
      label: `${LOCATIONS[loc].name} weekly calendar`,
      sub: `${list.length} event${list.length > 1 ? "s" : ""}`,
      location: loc,
      events: list,
      template: layout,
      look: `${MIX_NAMES[layout]} · "${title}"`,
      fileBase: `${loc === "goa" ? "01" : "02"}-${loc}-calendar-${range.replace(" ", "")}`,
      photoPath: null,
      render: (size) => <MixCalendar layout={layout} sections={sections} range={weekRange(week)} size={size} title={title} />,
    });
  }

  // ── event posters: Postcard / Polaroid / Cover, dealt like cards so neighbours differ
  const deck = shuffled(MIX_LAYOUTS, hash(seed, "deck"));
  sorted.forEach((e, i) => {
    const off = offsets[e.id] ?? 0;
    const pick = offsets[`style:${e.id}`];
    const layout = pick !== undefined ? MIX_LAYOUTS[pick % 3] : deck[(i + off) % deck.length];
    const s = hash(seed, e.id, Math.floor(off / deck.length)); // photo changes once all three styles have been shown
    const photos_ = photoPool(e, photos);
    const photoPath = photos_.length ? photos_[hash(s, "photo") % photos_.length] : null;
    const photo = photoPath ? photoData[photoPath] ?? null : null;
    const qr = e.show_qr ? qrData[e.id] ?? null : null;
    const pe = toPosterEvent(e);
    specs.push({
      key: e.id,
      kind: "event",
      label: e.name,
      sub: `${dayName(e.event_date, true)} ${dateShort(e.event_date)} · ${LOCATIONS[e.location].name}`,
      location: e.location,
      event: e,
      events: [e],
      template: layout,
      look: `${MIX_NAMES[layout]}${photoPath ? "" : " · no photo"}`,
      fileBase: `${String(i + 3).padStart(2, "0")}-${e.location}-${safeName(e.name)}-${dayName(e.event_date, true).toLowerCase()}`,
      photoPath,
      render: (size) => <MixPoster layout={layout} ev={pe} size={size} photo={photo} qr={qr} />,
    });
  });
  return specs;
}
