"use client";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { useAuth } from "@/components/app/Auth";
import { useToast } from "@/components/app/Toast";
import { publicUrl, sb } from "@/lib/supabase";
import { EVENT_TYPES, eventType, slugify, type LocationId } from "@/lib/constants";
import { compressImage } from "@/lib/export";
import type { PhotoRow } from "@/lib/types";

type Tab = LocationId | "any";

export default function GalleryPage() {
  const { profile, session } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("goa");
  const [photos, setPhotos] = useState<PhotoRow[] | null>(null);
  const [usedTypes, setUsedTypes] = useState<string[]>([]);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [newType, setNewType] = useState("");

  useEffect(() => {
    if (profile?.location) setTab(profile.location);
  }, [profile?.location]);

  const load = useCallback(async () => {
    const [{ data, error }, { data: ev }] = await Promise.all([sb().from("photos").select("*").order("created_at", { ascending: false }), sb().from("events").select("event_type")]);
    if (error) return toast(error.message, "err");
    setPhotos((data as PhotoRow[]) ?? []);
    setUsedTypes([...new Set(((ev as { event_type: string }[]) ?? []).map((e) => e.event_type))]);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(typeSlug: string, files: FileList) {
    setBusyType(typeSlug);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file);
        const path = `gallery/${typeSlug}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb().storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const { error: e2 } = await sb().from("photos").insert({ location: tab, event_type: typeSlug, path, created_by: session?.user.id });
        if (e2) throw e2;
        ok++;
      } catch (e) {
        toast(`${file.name}: ${(e as Error).message}`, "err");
      }
    }
    setBusyType(null);
    if (ok) toast(`${ok} photo${ok > 1 ? "s" : ""} added`);
    load();
  }

  async function remove(p: PhotoRow) {
    if (!confirm("Remove this photo from the gallery?")) return;
    await sb().storage.from("media").remove([p.path]);
    const { error } = await sb().from("photos").delete().eq("id", p.id);
    if (error) toast(error.message, "err");
    load();
  }

  const extraTypes = [...new Set([...usedTypes, ...(photos ?? []).map((p) => p.event_type)])].filter((t) => !EVENT_TYPES.some((e) => e.slug === t));
  const allTypes = [...EVENT_TYPES.map((t) => t.slug), ...extraTypes];
  const visible = (photos ?? []).filter((p) => p.location === tab);

  return (
    <Shell wide>
      <div className="mb-5">
        <h1 className="font-display text-3xl font-extrabold">Photo gallery</h1>
        <p className="text-mute text-sm max-w-2xl">
          Add 5–10 good photos for each kind of event. Every time you shuffle, a poster picks a different photo from its event type. Photos are resized automatically.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {([["goa", "🌴 Goa"], ["dharamkot", "🏔️ Dharamkot"], ["any", "Both locations"]] as [Tab, string][]).map(([v, l]) => (
          <button key={v} className={`chip ${tab === v ? "chip-on" : ""}`} onClick={() => setTab(v)}>
            {l} <span className="opacity-70">{(photos ?? []).filter((p) => p.location === v).length}</span>
          </button>
        ))}
      </div>
      {tab === "any" && <p className="hint mb-4">Photos here are used for both Goa and Dharamkot posters.</p>}
      {photos === null ? (
        <p className="text-mute">Loading…</p>
      ) : (
        <div className="space-y-4">
          {allTypes.map((slug) => {
            const t = eventType(slug);
            const list = visible.filter((p) => p.event_type === slug);
            return (
              <section key={slug} className="card p-4">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="font-semibold text-lg mr-auto">
                    {t.emoji} {t.name} <span className="text-mute text-sm font-normal">· {list.length} photo{list.length === 1 ? "" : "s"}</span>
                  </h2>
                  <label className="btn-ghost btn-sm">
                    {busyType === slug ? "Uploading…" : "+ Add photos"}
                    <input type="file" accept="image/*" multiple className="sr-only" disabled={busyType !== null} onChange={(e) => e.target.files?.length && upload(slug, e.target.files)} />
                  </label>
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-mute">No photos yet. Posters for this type use line art until you add some.</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {list.map((p) => (
                      <div key={p.id} className="relative shrink-0 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={publicUrl(p.path)!} alt="" className="h-28 w-28 object-cover rounded-xl border border-line" loading="lazy" />
                        {(profile?.role === "admin" || p.created_by === session?.user.id) && (
                          <button className="absolute top-1 right-1 rounded-full bg-black/70 text-white text-xs px-2 py-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => remove(p)} aria-label="Remove photo">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          <section className="card p-4 flex flex-wrap gap-3 items-center">
            <span className="font-semibold">Add a new event type</span>
            <input className="input !w-auto" placeholder="e.g. Pottery" value={newType} onChange={(e) => setNewType(e.target.value)} />
            <button
              className="btn-ghost"
              disabled={!slugify(newType)}
              onClick={() => {
                setUsedTypes((x) => [...x, slugify(newType)]);
                setNewType("");
              }}
            >
              Add type
            </button>
          </section>
        </div>
      )}
    </Shell>
  );
}
