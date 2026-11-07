"use client";
import { sb } from "./supabase";
import type { Captions } from "./captions";
import type { SizeId } from "./constants";

/** What the archive needs to know about a poster (a subset of PosterSpec). */
export interface ArchivablePoster {
  key: string;
  kind: string;
  location: string;
  label: string;
  sub: string;
  look: string;
  fileBase: string;
  event?: { id: string; event_date: string };
}

export interface SavedPoster {
  id: string;
  week_start: string;
  poster_key: string;
  size: SizeId;
  kind: string;
  location: string | null;
  label: string;
  sub: string | null;
  look: string | null;
  event_id: string | null;
  event_date: string | null;
  image_path: string;
  captions: Partial<Captions>;
  saved_by: string | null;
  saved_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

export interface WeekLook {
  seed: number;
  offsets: Record<string, number>;
  captions: Record<string, Captions>;
}

/* ───────── remembered look per week ───────── */

export async function loadLook(week: string): Promise<WeekLook | null> {
  const { data, error } = await sb().from("week_looks").select("seed, offsets, captions").eq("week_start", week).maybeSingle();
  if (error || !data) return null;
  return { seed: Number(data.seed), offsets: data.offsets ?? {}, captions: data.captions ?? {} };
}

export async function saveLook(week: string, look: WeekLook, userId: string) {
  const { error } = await sb()
    .from("week_looks")
    .upsert({ week_start: week, seed: look.seed, offsets: look.offsets, captions: look.captions, updated_by: userId, updated_at: new Date().toISOString() });
  return !error;
}

/* ───────── saved posters ───────── */

/** PNG → high-quality JPEG (about a fifth of the size; still sharp at 1080px). */
async function toJpeg(png: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(png);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not save image"))), "image/jpeg", 0.92));
}

/**
 * Keep a copy of a poster the team actually used. One per poster per size per week;
 * saving again replaces the older version. Never throws (archiving must not block a download).
 */
export async function archivePoster(o: { week: string; poster: ArchivablePoster; size: SizeId; png: Blob; captions: Captions; userId: string }) {
  try {
    const jpg = await toJpeg(o.png);
    const path = `archive/${o.week}/${o.poster.fileBase}-${o.size}-${Date.now()}.jpg`;
    const up = await sb().storage.from("media").upload(path, jpg, { contentType: "image/jpeg", upsert: false });
    if (up.error) return false;
    const { data: old } = await sb()
      .from("saved_posters")
      .select("image_path")
      .eq("week_start", o.week)
      .eq("poster_key", o.poster.key)
      .eq("size", o.size)
      .maybeSingle();
    const { error } = await sb()
      .from("saved_posters")
      .upsert(
        {
          week_start: o.week,
          poster_key: o.poster.key,
          size: o.size,
          kind: o.poster.kind,
          location: o.poster.location,
          label: o.poster.label,
          sub: o.poster.sub,
          look: o.poster.look,
          event_id: o.poster.event?.id ?? null,
          event_date: o.poster.event?.event_date ?? null,
          image_path: path,
          captions: o.captions,
          saved_by: o.userId,
          saved_at: new Date().toISOString(),
        },
        { onConflict: "week_start,poster_key,size" }
      );
    if (error) {
      await sb().storage.from("media").remove([path]);
      return false;
    }
    if (old?.image_path && old.image_path !== path) await sb().storage.from("media").remove([old.image_path]);
    return true;
  } catch {
    return false;
  }
}

export async function listWeeks(): Promise<{ week: string; count: number }[]> {
  const { data } = await sb().from("saved_posters").select("week_start").order("week_start", { ascending: false }).limit(5000);
  const m = new Map<string, number>();
  for (const r of data ?? []) m.set(r.week_start, (m.get(r.week_start) ?? 0) + 1);
  return [...m].map(([week, count]) => ({ week, count }));
}

export async function listSaved(week: string): Promise<SavedPoster[]> {
  const { data } = await sb().from("saved_posters").select("*, profiles:saved_by(full_name, email)").eq("week_start", week).order("poster_key");
  return (data as SavedPoster[]) ?? [];
}
