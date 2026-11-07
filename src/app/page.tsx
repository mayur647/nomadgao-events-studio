"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { useAuth } from "@/components/app/Auth";
import { useToast } from "@/components/app/Toast";
import { Preview } from "@/components/posters/Preview";
import { buildSpecs, photoPool, type PosterSpec } from "@/components/posters/specs";
import { publicUrl, sb } from "@/lib/supabase";
import { SIZES, type LocationId, type SizeId } from "@/lib/constants";
import { addDays, parseDate, planningWeek, rsvpUrl, toISO, todayIST, weekRange, weekStart } from "@/lib/format";
import { hash } from "@/lib/rng";
import { CHANNELS, eventCaptions, weekCaptions, type Captions, type Channel } from "@/lib/captions";
import { canShareFiles, copyText, downloadBlob, openWhatsApp, qrDataUrl, renderPng, shareFiles, toDataUrl, zipFiles } from "@/lib/export";
import type { EventRow, PhotoRow } from "@/lib/types";
import { archivePoster, archiveProblem, loadLook, saveLook } from "@/lib/archive";

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

  // The Studio only shows this week and next week; older weeks live in Past posters.
  const thisWeek = toISO(weekStart(todayIST()));
  const nextWeek = toISO(addDays(weekStart(todayIST()), 7));
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("week");
    if (w === thisWeek || w === nextWeek) setWeek(w);
    else if (w && w < thisWeek) toast("Older weeks are in Past posters. The Studio shows this week and next week.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each week opens with the look the team last chose (saved), or a fresh one. Shuffle changes it.
  const [lookReady, setLookReady] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    let live = true;
    setLookReady(false);
    dirty.current = false;
    setCapSeed({});
    loadLook(week).then((l) => {
      if (!live) return;
      setSeed(l?.seed ?? hash("week", week));
      setOffsets(l?.offsets ?? {});
      setCaptions(l?.captions ?? {});
      setLookReady(true);
    });
    return () => {
      live = false;
    };
  }, [week]);

  // Remember shuffles and caption edits for this week (quietly, a second after the last change).
  useEffect(() => {
    if (!lookReady || !dirty.current || !session) return;
    const t = setTimeout(() => {
      saveLook(week, { seed, offsets, captions }, session.user.id);
    }, 1200);
    return () => clearTimeout(t);
  }, [seed, offsets, captions, lookReady, week, session]);
  const touch = () => (dirty.current = true);

  /** Keep a copy of what was actually used, for Past posters. */
  const keep = useCallback(
    (spec: PosterSpec, size: SizeId, png: Blob, c: Captions) => {
      if (!session) return Promise.resolve(false);
      return archivePoster({ week, poster: spec, size, png, captions: c, userId: session.user.id });
    },
    [session, week]
  );

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

  const specs = useMemo(() => (events && lookReady ? buildSpecs({ week, events, photos, seed, offsets, photoData, qrData }) : []), [week, events, photos, seed, offsets, photoData, qrData, lookReady]);
  // Archived posters are saved to Past posters and hidden here (kept in the week's saved look as "archived:<key>").
  const archived = useMemo(() => new Set(Object.keys(offsets).filter((k) => k.startsWith("archived:")).map((k) => k.slice(9))), [offsets]);
  const [showArchived, setShowArchived] = useState(false);
  const inFilter = specs.filter((s) => filter === "all" || s.location === filter);
  const shown = inFilter.filter((s) => !archived.has(s.key));
  const hidden = inFilter.filter((s) => archived.has(s.key));
  const today = toISO(todayIST());
  const pastEvents = shown.filter((s) => s.kind === "event" && s.event && s.event.event_date < today);

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
    const made: [PosterSpec, SizeId, Blob][] = [];
    let n = 0;
    try {
      for (const s of list) {
        for (const sz of zipSizes) {
          setProgress(`Making image ${++n} of ${total}…`);
          const png = await render(s, sz);
          made.push([s, sz, png]);
          files.push({ name: `${sz}/${s.fileBase}-${sz}.png`, data: png });
        }
        const c = captionsFor(s);
        files.push({ name: `captions/${s.fileBase}.txt`, data: CHANNELS.map((ch) => `── ${ch.label} ──\n${c[ch.id]}\n`).join("\n") });
      }
      setProgress("Zipping…");
      const zip = await zipFiles(files);
      downloadBlob(zip, `nomadgao-week-${week}${filter === "all" ? "" : `-${filter}`}.zip`);
      log(list.map((s) => ({ spec: s, action: "zip", size: zipSizes.join(","), count: zipSizes.length })));
      toast(`Downloaded ${total} images and ${list.length} caption files`);
      setProgress("Saving to Past posters…");
      let ok = 0;
      for (const [s, sz, png] of made) if (await keep(s, sz, png, captionsFor(s))) ok++;
      if (ok) toast(`Saved ${ok} posters to Past posters`);
    } catch (e) {
      toast(`Something went wrong making the ZIP: ${(e as Error).message}`, "err");
    } finally {
      setProgress(null);
    }
  }

  function shuffleAll() {
    touch();
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setOffsets((o) => Object.fromEntries(Object.entries(o).filter(([k]) => k.startsWith("archived:"))));
  }

  /** Save all three sizes to Past posters, then hide the poster from the Studio. */
  async function archive(list: PosterSpec[]) {
    let n = 0;
    const done: PosterSpec[] = [];
    try {
      for (const s of list) {
        n++;
        let ok = true;
        for (const sz of ALL_SIZES) {
          setProgress(`Archiving ${n} of ${list.length}…`);
          ok = (await keep(s, sz, await render(s, sz), captionsFor(s))) && ok;
        }
        if (ok) done.push(s);
      }
      if (done.length) {
        touch();
        setOffsets((o) => ({ ...o, ...Object.fromEntries(done.map((s) => [`archived:${s.key}`, 1])) }));
      }
      if (done.length === list.length) toast(list.length === 1 ? `Archived "${list[0].label}". It's in Past posters.` : `Archived ${list.length} posters. They're in Past posters.`);
      else toast(`Couldn't archive ${list.length - done.length === 1 ? "this poster" : `${list.length - done.length} posters`}, so ${list.length - done.length === 1 ? "it stays" : "they stay"} here. ${archiveProblem() ?? "Try again."}`, "err");
    } catch (e) {
      toast(`Couldn't archive: ${(e as Error).message}`, "err");
    } finally {
      setProgress(null);
    }
  }

  function restore(s: PosterSpec) {
    touch();
    setOffsets((o) => {
      const x = { ...o };
      delete x[`archived:${s.key}`];
      return x;
    });
  }

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-extrabold">Poster studio</h1>
          <p className="text-mute text-sm">
            Week of {weekRange(week)}. Shuffle until you like the look, then download or share. Everything you download is kept in{" "}
            <Link href="/archive" className="underline">Past posters</Link>.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-line bg-white overflow-hidden" role="radiogroup" aria-label="Week">
          {[
            [thisWeek, "This week"],
            [nextWeek, "Next week"],
          ].map(([w, label]) => (
            <button key={w} role="radio" aria-checked={week === w} onClick={() => setWeek(w)} className={`px-4 py-2 text-sm font-semibold ${week === w ? "bg-moss text-white" : "hover:bg-matcha-soft"}`}>
              {label} <span className={`font-normal ${week === w ? "text-white/80" : "text-mute"}`}>· {weekRange(w)}</span>
            </button>
          ))}
        </div>
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
        {pastEvents.length > 0 && (
          <button className="btn-ghost" onClick={() => archive(pastEvents)} disabled={!!progress} title="Save them to Past posters and hide them here">
            Archive {pastEvents.length} past event{pastEvents.length === 1 ? "" : "s"}
          </button>
        )}
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

      {events === null || !lookReady ? (
        <p className="text-mute">Loading this week…</p>
      ) : events.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-hand text-3xl text-moss">no events this week yet</p>
          <p className="text-mute mt-1 mb-5">Add the week&apos;s events and every poster, calendar and caption appears here.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/import" className="btn-primary">Import the week</Link>
            <Link href="/events/new" className="btn-ghost">+ Add one event</Link>
            <Link href="/samples" className="btn-ghost">See sample posters</Link>
          </div>
        </div>
      ) : (
        <>
        {shown.length === 0 && (
          <div className="card p-8 text-center mb-6">
            <p className="font-hand text-3xl text-moss">all archived</p>
            <p className="text-mute mt-1">Every poster for this week is in <Link href="/archive" className="underline">Past posters</Link>.</p>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...shown, ...(showArchived ? hidden : [])].map((s) => (
            <PosterCard
              key={s.key}
              archived={archived.has(s.key)}
              onArchive={() => archive([s])}
              onRestore={() => restore(s)}
              busyAll={!!progress}
              spec={s}
              size={size}
              captions={captionsFor(s)}
              onCaption={(c) => {
                touch();
                setCaptions((x) => ({ ...x, [s.key]: c }));
              }}
              onNewCaption={() => {
                touch();
                setCaptions((x) => {
                  const y = { ...x };
                  delete y[s.key];
                  return y;
                });
                setCapSeed((x) => ({ ...x, [s.key]: (x[s.key] ?? 0) + 1 }));
              }}
              onShuffle={() => {
                touch();
                setOffsets((o) => ({ ...o, [s.key]: (o[s.key] ?? 0) + 1 }));
              }}
              render={render}
              keep={keep}
              log={log}
              week={week}
            />
          ))}
        </div>
        {hidden.length > 0 && (
          <div className="mt-6 text-sm text-mute flex flex-wrap items-center gap-2">
            {hidden.length} archived poster{hidden.length === 1 ? "" : "s"} hidden this week.
            <button className="underline" onClick={() => setShowArchived((x) => !x)}>
              {showArchived ? "Hide them" : "Show them"}
            </button>
            <span>·</span>
            <Link href={`/archive?week=${week}`} className="underline">
              Open Past posters
            </Link>
          </div>
        )}
        </>
      )}
    </Shell>
  );
}

function PosterCard({
  archived,
  onArchive,
  onRestore,
  busyAll,
  spec,
  size,
  captions,
  onCaption,
  onNewCaption,
  onShuffle,
  render,
  keep,
  log,
  week,
}: {
  archived: boolean;
  onArchive: () => void;
  onRestore: () => void;
  busyAll: boolean;
  spec: PosterSpec;
  size: SizeId;
  captions: Captions;
  onCaption: (c: Captions) => void;
  onNewCaption: () => void;
  onShuffle: () => void;
  render: (s: PosterSpec, sz: SizeId) => Promise<Blob>;
  keep: (s: PosterSpec, sz: SizeId, png: Blob, c: Captions) => Promise<boolean>;
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
      const png = await render(spec, size);
      downloadBlob(png, `${spec.fileBase}-${size}.png`);
      log([{ spec, action: "download", size }]);
      keep(spec, size, png, captions);
    });

  const downloadSizes = () =>
    run("sizes", async () => {
      const files: { name: string; data: Blob | string }[] = [];
      const made: [SizeId, Blob][] = [];
      for (const sz of ALL_SIZES) {
        const png = await render(spec, sz);
        made.push([sz, png]);
        files.push({ name: `${spec.fileBase}-${sz}.png`, data: png });
      }
      files.push({ name: `${spec.fileBase}-captions.txt`, data: CHANNELS.map((ch) => `── ${ch.label} ──\n${captions[ch.id]}\n`).join("\n") });
      downloadBlob(await zipFiles(files), `${spec.fileBase}.zip`);
      log([{ spec, action: "zip", size: "story,post,square", count: 3 }]);
      for (const [sz, png] of made) await keep(spec, sz, png, captions);
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
        keep(spec, size, blob, captions);
      }
    });

  const whatsapp = () =>
    run("wa", async () => {
      const blob = await render(spec, size);
      const copied = await openWhatsApp(blob, captions.whatsapp);
      toast(copied ? "WhatsApp opened with the caption. Pick a group, then press Ctrl+V to attach the poster." : "WhatsApp opened with the caption. Download the poster and attach it.");
      log([{ spec, action: "whatsapp", size }]);
      keep(spec, size, blob, captions);
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
    <article className={`card p-3 flex flex-col ${archived ? "opacity-60" : ""}`}>
      <Preview w={SIZES[size].w} h={SIZES[size].h} maxH={560}>
        {spec.render(size)}
      </Preview>
      <div className="flex items-start gap-2 mt-3">
        <div className="mr-auto min-w-0">
          <h2 className="font-semibold leading-tight truncate">{spec.label}</h2>
          <p className="text-xs text-mute">{spec.sub}</p>
          <p className="text-xs text-mute">{spec.look}</p>
        </div>
        {archived ? (
          <button className="btn-ghost btn-sm" onClick={onRestore} title="Bring it back to the Studio">
            Restore
          </button>
        ) : (
          <>
            <button className="btn-ghost btn-sm" onClick={onShuffle} title="Try another layout and photo">
              🎲 Shuffle
            </button>
            <button className="btn-ghost btn-sm" onClick={onArchive} disabled={busyAll} title="Save all 3 sizes to Past posters and hide it here">
              Archive
            </button>
          </>
        )}
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
        <textarea className="input !text-sm font-normal flex-1 min-h-[240px]" value={text} onChange={(e) => onCaption({ ...captions, [channel]: e.target.value })} aria-label={`${channel} caption`} />
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
