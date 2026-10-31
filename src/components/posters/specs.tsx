"use client";
import type { ReactNode } from "react";
import { LOCATIONS, SIZES, type BrandId, type LocationId, type SizeId } from "@/lib/constants";
import { FONT_SETS, PALETTES, palettePool } from "@/lib/themes";
import { hash, pick, shuffled } from "@/lib/rng";
import type { EventRow, PhotoRow } from "@/lib/types";
import { safeName } from "@/lib/export";
import { dateShort, dayName } from "@/lib/format";
import { toPosterEvent } from "./common";
import { EVENT_TEMPLATES, EventPoster, TEMPLATE_NAMES } from "./EventPoster";
import { CAL_NAMES, CAL_TEMPLATES, JOINT_TEMPLATES, JointCalendar, LocationCalendar } from "./Calendars";

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

  // ── joint calendar
  if (sorted.length) {
    const off = offsets.joint ?? 0;
    const s = hash(seed, "joint", off);
    const template = pick(JOINT_TEMPLATES, s);
    const goaPal = pick(PALETTES.goa, hash(s, "g"));
    const dkPal = pick(PALETTES.dharamkot, hash(s, "d"));
    const font = pick(FONT_SETS, hash(s, "f"));
    const brands: BrandId[] = sorted.some((e) => e.brands?.includes("hotpot")) ? ["nomadgao", "hotpot"] : ["nomadgao"];
    const pg = goa.map(toPosterEvent), pd = dk.map(toPosterEvent);
    specs.push({
      key: "joint",
      kind: "joint",
      label: "Joint weekly calendar",
      sub: "Goa + Dharamkot",
      location: "both",
      events: sorted,
      template,
      look: `${CAL_NAMES[template]} · ${goaPal.name} + ${dkPal.name} · ${font.name}`,
      fileBase: `00-joint-calendar-${range.replace(" ", "")}`,
      photoPath: null,
      render: (size) => <JointCalendar template={template} week={week} goa={pg} dharamkot={pd} size={size} w={SIZES[size].w} h={SIZES[size].h} goaPal={goaPal} dkPal={dkPal} font={font} seed={s} brands={brands} />,
    });
  }

  // ── per-location calendars
  for (const [loc, list] of [["goa", goa], ["dharamkot", dk]] as [LocationId, EventRow[]][]) {
    if (!list.length) continue;
    const key = `cal-${loc}`;
    const off = offsets[key] ?? 0;
    const s = hash(seed, key, off);
    const template = pick(CAL_TEMPLATES, s);
    const brands: BrandId[] = [...new Set(list.flatMap((e) => e.brands ?? ["nomadgao"]))] as BrandId[];
    const ordered: BrandId[] = brands.includes("hotpot") && brands.includes("nomadgao") ? ["hotpot", "nomadgao"] : brands.length ? brands : ["nomadgao"];
    const pal = pick(shuffled(palettePool(loc, ordered), hash(s, "pal")), 0);
    const font = pick(FONT_SETS, hash(s, "font"));
    const pe = list.map(toPosterEvent);
    specs.push({
      key,
      kind: "location",
      label: `${LOCATIONS[loc].name} weekly calendar`,
      sub: `${list.length} event${list.length > 1 ? "s" : ""}`,
      location: loc,
      events: list,
      template,
      look: `${CAL_NAMES[template]} · ${pal.name} · ${font.name}`,
      fileBase: `${loc === "goa" ? "01" : "02"}-${loc}-calendar-${range.replace(" ", "")}`,
      photoPath: null,
      render: (size) => <LocationCalendar template={template} location={loc} brands={ordered} week={week} events={pe} size={size} w={SIZES[size].w} h={SIZES[size].h} pal={pal} font={font} seed={s} />,
    });
  }

  // ── event posters: templates dealt like cards so neighbours differ
  const deck = shuffled(EVENT_TEMPLATES, hash(seed, "deck"));
  const palDeck: Record<LocationId, number> = { goa: 0, dharamkot: 0 };
  sorted.forEach((e, i) => {
    const off = offsets[e.id] ?? 0;
    const s = hash(seed, e.id, off);
    const template = deck[(i + off) % deck.length];
    const brands: BrandId[] = e.brands?.length ? e.brands : ["nomadgao"];
    const pool = shuffled(palettePool(e.location, brands), hash(seed, e.location, "pals"));
    const pal = pool[(palDeck[e.location]++ + off) % pool.length];
    const font = pick(FONT_SETS, hash(s, "font"));
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
      template,
      look: `${TEMPLATE_NAMES[template]} · ${pal.name} · ${font.name}${photoPath ? "" : " · no photo"}`,
      fileBase: `${String(i + 3).padStart(2, "0")}-${e.location}-${safeName(e.name)}-${dayName(e.event_date, true).toLowerCase()}`,
      photoPath,
      render: (size) => <EventPoster template={template} ev={pe} size={size} w={SIZES[size].w} h={SIZES[size].h} pal={pal} font={font} seed={s} photo={photo} qr={qr} />,
    });
  });
  return specs;
}
