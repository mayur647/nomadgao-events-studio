"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { WeekPicker } from "@/components/app/WeekPicker";
import { useAuth } from "@/components/app/Auth";
import { useToast } from "@/components/app/Toast";
import { Preview } from "@/components/posters/Preview";
import { buildSpecs, photoPool, type PosterSpec } from "@/components/posters/specs";
import { publicUrl, sb } from "@/lib/supabase";
import { SIZES, type LocationId, type SizeId } from "@/lib/constants";
import { addDays, parseDate, planningWeek, rsvpUrl, toISO, weekRange } from "@/lib/format";
import { hash } from "@/lib/rng";
import { CHANNELS, eventCaptions, weekCaptions, type Captions, type Channel } from "@/lib/captions";
import { canShareFiles, copyText, downloadBlob, openWhatsApp, qrDataUrl, renderPng, shareFiles, toDataUrl, zipFiles } from "@/lib/export";
import type { EventRow, PhotoRow } from "@/lib/types";

const ALL_SIZES: SizeId[] = ["story", "post", "square"];

function templateCaptions(spec: PosterSpec, week: string, origin: string, seed: number): Captions {
  if (spec.kind === "event" && spec.event) return eventCaptions(spec.event, origin, seed);
  return weekCaptions(spec.events, week, spec.location as LocationId | "both", origin, seed);
}

export default function StudioPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [week, setWeek] = useState(planningWeek());
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [seed, setSeed] = useState(0);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [photoData, setPhotoData] = useState<Record<string, string | null>>({});
  const [qrData, setQrData] = useState<Record<string, string | null>>({});
  const [size, setSize] = useState<SizeId>("post");
  const [zipSizes, setZipSizes] = useState<SizeId[]>(ALL_SIZES);
  const [filter, setFilter] = useState<"all" | LocationId>("all");
  const [captions, setCaptions] = useState<Record<string, Captions>>({});
  const [capSeed, setCapSeed] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("week");
    if (w) setWeek(w);
  }, []);

  // A fresh look every week; Shuffle changes it.
  useEffect(() => {
    setSeed(hash("week", week));
    setOffsets({});
    setCaptions({});
    setCapSeed({});
  }, [week]);

  useEffect(() => {
    setEvents(null);
    const end = toISO(addDays(parseDate(week), 6));
    Promise.all([sb().from("events").select("*").gte("event_date", week).lte("event_date", end), sb().from("photos").select("*")]).then(([e, p]) => {
      if (e.error) toast(e.error.message, "err");
      setEvents((e.data as EventRow[]) ?? []);
      setPhotos((p.data as PhotoRow[]) ?? []);
    });
  }, [week, toast]);

  // Turn every photo and RSVP link the week could use into data URLs (keeps exports reliable).
  useEffect(() => {
    if (!events) return;
    const paths = [...new Set(events.flatMap((e) => photoPool(e, photos)))];
    paths.forEach((p) => {
      if (p in photoData) return;
      toDataUrl(publicUrl(p)).then((d) => setPhotoData((x) => ({ ...x, [p]: d })));
    });
    events.forEach((e) => {
      const url = rsvpUrl(e, window.location.origin);
      if (!url || !e.show_qr) return;
      qrDataUrl(url).then((d) => setQrData((x) => ({ ...x, [e.id]: d })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, photos]);

  const specs = useMemo(() => (events ? buildSpecs({ week, events, photos, seed, offsets, photoData, qrData }) : []), [week, events, photos, seed, offsets, photoData, qrData]);
  const shown = specs.filter((s) => filter === "all" || s.location === filter);

  const captionsFor = useCallback(
    (s: PosterSpec) => captions[s.key] ?? templateCaptions(s, week, origin, capSeed[s.key] ?? 0),
    [captions, capSeed, week, origin]
  );

  const log = useCallback(
    async (rows: { spec: PosterSpec; action: string; size?: string; count?: number }[]) => {
      if (!session) return;
      await sb()
        .from("generations")
        .insert(
          rows.map((r) => ({
            user_id: session.user.id,
            kind: r.spec.kind === "event" ? "event_poster" : r.spec.kind === "joint" ? "joint_calendar" : "location_calendar",
            action: r.action,
            location: r.spec.location,
            size: r.size ?? null,
            template: r.spec.template,
            event_id: r.spec.event?.id ?? null,
            week_start: week,
            count: r.count ?? 1,
          }))
        );
    },
    [session, week]
  );

  async function render(spec: PosterSpec, sz: SizeId) {
    return renderPng(spec.render(sz), SIZES[sz].w, SIZES[sz].h);
  }

  async function downloadAll() {
    const list = shown;
    const total = list.length * zipSizes.length;
    const files: { name: string; data: Blob | string }[] = [];
    let n = 0;
    try {
      for (const s of list) {
        for (const sz of zipSizes) {
          setProgress(`Making image ${++n} of ${total}…`);
          files.push({ name: `${sz}/${s.fileBase}-${sz}.png`, data: await render(s, sz) });
        }
        const c = captionsFor(s);
        files.push({ name: `captions/${s.fileBase}.txt`, data: CHANNELS.map((ch) => `── ${ch.label} ──\n${c[ch.id]}\n`).join("\n") });
      }
      setProgress("Zipping…");
      const zip = await zipFiles(files);
      downloadBlob(zip, `nomadgao-week-${week}${filter === "all" ? "" : `-${filter}`}.zip`);
      log(list.map((s) => ({ spec: s, action: "zip", size: zipSizes.join(","), count: zipSizes.length })));
      toast(`Downloaded ${total} images and ${list.length} caption files`);
    } catch (e) {
      toast(`Something went wrong making the ZIP: ${(e as Error).message}`, "err");
    } finally {
      setProgress(null);
    }
  }

  function shuffleAll() {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setOffsets({});
  }

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-extrabold">Poster studio</h1>
          <p className="text-mute text-sm">Week of {weekRange(week)}. Shuffle until you like the look, then download or share.</p>
        </div>
        <WeekPicker week={week} onChange={setWeek} />
      </div>

      <div className="card p-3 sm:p-4 mb-6 flex flex-wrap items-center gap-3 sticky top-0 z-20 shadow-sm">
        <div className="flex gap-1" role="radiogroup" aria-label="Preview size">
          {ALL_SIZES.map((s) => (
            <button key={s} role="radio" aria-checked={size === s} className={`chip ${size === s ? "chip-on" : ""}`} onClick={() => setSize(s)} title={SIZES[s].hint}>
              {SIZES[s].label}
            </button>
          ))}
        </div>
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as "all" | LocationId)} aria-label="Show">
          <option value="all">Both locations</option>
          <option value="goa">Goa only</option>
          <option value="dharamkot">Dharamkot only</option>
        </select>
        <button className="btn-ghost" onClick={shuffleAll} disabled={!specs.length}>
          🎲 Shuffle everything
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <fieldset className="flex items-center gap-2 text-sm">
            <legend className="sr-only">Sizes in the ZIP</legend>
            {ALL_SIZES.map((s) => (
              <label key={s} className="flex items-center gap-1">
                <input type="checkbox" checked={zipSizes.includes(s)} onChange={() => setZipSizes((z) => (z.includes(s) ? z.filter((x) => x !== s) : [...z, s]))} />
                {SIZES[s].label}
              </label>
            ))}
          </fieldset>
          <button className="btn-primary" onClick={downloadAll} disabled={!shown.length || !zipSizes.length || !!progress}>
            {progress ?? `Download all (ZIP)`}
          </button>
        </div>
      </div>

      {events === null ? (
        <p className="text-mute">Loading this week…</p>
      ) : events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-hand text-3xl text-moss">no events this week yet</p>
          <p className="text-mute mt-1 mb-5">Add the week&apos;s events and every poster, calendar and caption appears here.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/events/new" className="btn-primary">+ Add an event</Link>
            <Link href="/samples" className="btn-ghost">See sample posters</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => (
            <PosterCard
              key={s.key}
              spec={s}
              size={size}
              captions={captionsFor(s)}
              onCaption={(c) => setCaptions((x) => ({ ...x, [s.key]: c }))}
              onNewCaption={() => {
                setCaptions((x) => {
                  const y = { ...x };
                  delete y[s.key];
                  return y;
                });
                setCapSeed((x) => ({ ...x, [s.key]: (x[s.key] ?? 0) + 1 }));
              }}
              onShuffle={() => setOffsets((o) => ({ ...o, [s.key]: (o[s.key] ?? 0) + 1 }))}
              render={render}
              log={log}
              week={week}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

function PosterCard({
  spec,
  size,
  captions,
  onCaption,
  onNewCaption,
  onShuffle,
  render,
  log,
  week,
}: {
  spec: PosterSpec;
  size: SizeId;
  captions: Captions;
  onCaption: (c: Captions) => void;
  onNewCaption: () => void;
  onShuffle: () => void;
  render: (s: PosterSpec, sz: SizeId) => Promise<Blob>;
  log: (rows: { spec: PosterSpec; action: string; size?: string; count?: number }[]) => Promise<void>;
  week: string;
}) {
  const toast = useToast();
  const { session } = useAuth();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [busy, setBusy] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const shareOk = typeof window !== "undefined" && canShareFiles();
  const text = captions[channel];

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
    }
  }

  const download = () =>
    run("download", async () => {
      downloadBlob(await render(spec, size), `${spec.fileBase}-${size}.png`);
      log([{ spec, action: "download", size }]);
    });

  const downloadSizes = () =>
    run("sizes", async () => {
      const files: { name: string; data: Blob | string }[] = [];
      for (const sz of ALL_SIZES) files.push({ name: `${spec.fileBase}-${sz}.png`, data: await render(spec, sz) });
      files.push({ name: `${spec.fileBase}-captions.txt`, data: CHANNELS.map((ch) => `── ${ch.label} ──\n${captions[ch.id]}\n`).join("\n") });
      downloadBlob(await zipFiles(files), `${spec.fileBase}.zip`);
      log([{ spec, action: "zip", size: "story,post,square", count: 3 }]);
    });

  const share = () =>
    run("share", async () => {
      const blob = await render(spec, size);
      const file = new File([blob], `${spec.fileBase}-${size}.png`, { type: "image/png" });
      const r = await shareFiles([file], text, spec.label);
      if (r === "unsupported") toast("This browser can't share images. Use Download or WhatsApp instead.", "err");
      if (r === "shared") {
        toast("Shared. The caption is also copied, in case the app dropped it.");
        log([{ spec, action: "share", size }]);
      }
    });

  const whatsapp = () =>
    run("wa", async () => {
      const blob = await render(spec, size);
      const copied = await openWhatsApp(blob, captions.whatsapp);
      toast(copied ? "WhatsApp opened with the caption. Pick a group, then press Ctrl+V to attach the poster." : "WhatsApp opened with the caption. Download the poster and attach it.");
      log([{ spec, action: "whatsapp", size }]);
    });

  async function ai() {
    setAiBusy(true);
    try {
      const token = session?.access_token;
      const origin = window.location.origin;
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          kind: spec.kind,
          week,
          weekLabel: weekRange(week),
          location: spec.location,
          events: spec.events.map((e) => ({ ...e, rsvp_url: rsvpUrl(e, origin) })),
          draft: captions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI captions failed");
      onCaption(data.captions);
      toast("Fresh captions written");
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <article className="card p-3 flex flex-col">
      <Preview w={SIZES[size].w} h={SIZES[size].h} maxH={560}>
        {spec.render(size)}
      </Preview>
      <div className="flex items-start gap-2 mt-3">
        <div className="mr-auto min-w-0">
          <h2 className="font-semibold leading-tight truncate">{spec.label}</h2>
          <p className="text-xs text-mute">{spec.sub}</p>
          <p className="text-xs text-mute">{spec.look}</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={onShuffle} title="Try another layout, colours and photo">
          🎲 Shuffle
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button className="btn-primary btn-sm" onClick={download} disabled={!!busy}>
          {busy === "download" ? "Making…" : `Download ${SIZES[size].label.toLowerCase()}`}
        </button>
        <button className="btn-ghost btn-sm" onClick={downloadSizes} disabled={!!busy}>
          {busy === "sizes" ? "Making…" : "All 3 sizes"}
        </button>
        <button className="btn-ghost btn-sm" onClick={whatsapp} disabled={!!busy}>
          {busy === "wa" ? "Opening…" : "WhatsApp"}
        </button>
        {shareOk && (
          <button className="btn-ghost btn-sm" onClick={share} disabled={!!busy}>
            {busy === "share" ? "Opening…" : "Share…"}
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-1 mb-2" role="tablist" aria-label="Caption">
          {CHANNELS.map((c) => (
            <button key={c.id} role="tab" aria-selected={channel === c.id} className={`chip !text-xs !py-1 ${channel === c.id ? "chip-on" : ""}`} onClick={() => setChannel(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <textarea className="input !text-sm font-normal flex-1 min-h-[180px]" value={text} onChange={(e) => onCaption({ ...captions, [channel]: e.target.value })} aria-label={`${channel} caption`} />
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <button className="btn-ghost btn-sm" onClick={() => copyText(text).then(() => toast("Caption copied"))}>
            Copy caption
          </button>
          <button className="btn-ghost btn-sm" onClick={ai} disabled={aiBusy}>
            {aiBusy ? "Writing…" : "✨ Rewrite with AI"}
          </button>
          <button className="btn-ghost btn-sm" onClick={onNewCaption} title="Another template version">
            Reset
          </button>
          <span className="hint !mt-0 ml-auto">{CHANNELS.find((c) => c.id === channel)?.hint}</span>
        </div>
      </div>
    </article>
  );
}
