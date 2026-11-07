"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { useToast } from "@/components/app/Toast";
import { listSaved, listWeeks, type SavedPoster } from "@/lib/archive";
import { CHANNELS, type Channel } from "@/lib/captions";
import { SIZES, type LocationId, type SizeId } from "@/lib/constants";
import { copyText, downloadBlob, zipFiles } from "@/lib/export";
import { toISO, todayIST, weekRange, weekStart } from "@/lib/format";
import { publicUrl } from "@/lib/supabase";

const SIZE_ORDER: SizeId[] = ["post", "square", "story"];
const KIND_ORDER: Record<string, number> = { joint: 0, location: 1, event: 2 };

async function fetchBlob(path: string) {
  const r = await fetch(publicUrl(path)!);
  if (!r.ok) throw new Error("Couldn't load that image");
  return r.blob();
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function ArchivePage() {
  const toast = useToast();
  const [weeks, setWeeks] = useState<{ week: string; count: number }[] | null>(null);
  const [week, setWeek] = useState<string | null>(null);
  const [rows, setRows] = useState<SavedPoster[] | null>(null);
  const [filter, setFilter] = useState<"all" | LocationId>("all");
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    listWeeks().then((w) => {
      setWeeks(w);
      const fromUrl = new URLSearchParams(window.location.search).get("week");
      setWeek(fromUrl && w.some((x) => x.week === fromUrl) ? fromUrl : (w[0]?.week ?? null));
    });
  }, []);

  useEffect(() => {
    if (!week) return;
    setRows(null);
    listSaved(week).then(setRows);
  }, [week]);

  const posters = useMemo(() => {
    const m = new Map<string, SavedPoster[]>();
    for (const r of rows ?? []) {
      if (filter !== "all" && r.location !== filter && r.location !== "both") continue;
      m.set(r.poster_key, [...(m.get(r.poster_key) ?? []), r]);
    }
    return [...m.values()]
      .map((v) => v.sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)))
      .sort((a, b) => (KIND_ORDER[a[0].kind] ?? 9) - (KIND_ORDER[b[0].kind] ?? 9) || (a[0].event_date ?? "").localeCompare(b[0].event_date ?? "") || a[0].label.localeCompare(b[0].label));
  }, [rows, filter]);

  async function downloadWeek() {
    if (!week) return;
    setZipping(true);
    try {
      const files: { name: string; data: Blob | string }[] = [];
      for (const group of posters) {
        for (const r of group) files.push({ name: `${r.size}/${r.image_path.split("/").pop()!.replace(/-\d+\.jpg$/, ".jpg")}`, data: await fetchBlob(r.image_path) });
        const c = group[0].captions;
        files.push({ name: `captions/${group[0].label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`, data: CHANNELS.map((ch) => `── ${ch.label} ──\n${c[ch.id] ?? ""}\n`).join("\n") });
      }
      downloadBlob(await zipFiles(files), `nomadgao-past-posters-${week}.zip`);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setZipping(false);
    }
  }

  return (
    <Shell wide>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="mr-auto">
          <h1 className="font-display text-3xl font-extrabold">Past posters</h1>
          <p className="text-mute text-sm">Every poster the team downloaded or shared, exactly as it went out, with its captions.</p>
        </div>
        {weeks && weeks.length > 0 && (
          <>
            <select className="input !w-auto" value={week ?? ""} onChange={(e) => setWeek(e.target.value)} aria-label="Week">
              {weeks.map((w) => (
                <option key={w.week} value={w.week}>
                  Week of {weekRange(w.week)} · {w.count} image{w.count === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value as "all" | LocationId)} aria-label="Location">
              <option value="all">Both locations</option>
              <option value="goa">Goa</option>
              <option value="dharamkot">Dharamkot</option>
            </select>
            <button className="btn-primary" onClick={downloadWeek} disabled={zipping || !posters.length}>
              {zipping ? "Zipping…" : "Download this week (ZIP)"}
            </button>
          </>
        )}
      </div>

      {weeks === null || (week && rows === null) ? (
        <p className="text-mute">Loading…</p>
      ) : weeks.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-hand text-3xl text-moss">nothing saved yet</p>
          <p className="text-mute mt-1 mb-5 max-w-md mx-auto">
            From now on, every poster you download, share or send to WhatsApp from the Studio is kept here, grouped by week, so you can find and re-post it any time.
          </p>
          <Link href="/" className="btn-primary">
            Go to the Studio
          </Link>
        </div>
      ) : (
        <>
          {week && week >= toISO(weekStart(todayIST())) && (
            <p className="text-sm text-mute mb-4">
              Want to change something? <Link className="underline" href={`/?week=${week}`}>Open this week in the Studio</Link>; it opens with the same look and captions.
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posters.map((g) => (
              <SavedCard key={g[0].poster_key} group={g} />
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

function SavedCard({ group }: { group: SavedPoster[] }) {
  const toast = useToast();
  const [size, setSize] = useState<SizeId>(group[0].size);
  const [channel, setChannel] = useState<Channel>("instagram");
  const r = group.find((x) => x.size === size) ?? group[0];
  const text = r.captions[channel] ?? "";
  const by = r.profiles?.full_name || r.profiles?.email?.split("@")[0];

  async function download() {
    try {
      downloadBlob(await fetchBlob(r.image_path), `${r.image_path.split("/").pop()!.replace(/-\d+\.jpg$/, "")}.jpg`);
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  return (
    <article className="card p-3 flex flex-col">
      <div className="bg-ground rounded-xl overflow-hidden grid place-items-center" style={{ aspectRatio: "4 / 5" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={publicUrl(r.image_path)!} alt={r.label} loading="lazy" className="max-h-full max-w-full object-contain" style={{ aspectRatio: `${SIZES[r.size].w} / ${SIZES[r.size].h}` }} />
      </div>
      <h2 className="font-semibold leading-tight mt-3 truncate">{r.label}</h2>
      <p className="text-xs text-mute">{r.sub}</p>
      <p className="text-xs text-mute">
        Saved {when(r.saved_at)}
        {by ? ` by ${by}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-1 mt-3">
        {group.map((x) => (
          <button key={x.size} className={`chip !text-xs !py-1 ${x.size === size ? "chip-on" : ""}`} onClick={() => setSize(x.size)}>
            {SIZES[x.size].label}
          </button>
        ))}
        <button className="btn-primary btn-sm ml-auto" onClick={download}>
          Download
        </button>
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <div className="flex flex-wrap gap-1 mb-2" role="tablist" aria-label="Caption">
          {CHANNELS.map((c) => (
            <button key={c.id} role="tab" aria-selected={channel === c.id} className={`chip !text-xs !py-1 ${channel === c.id ? "chip-on" : ""}`} onClick={() => setChannel(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-sm whitespace-pre-line line-clamp-5 text-ink/80">{text || "No caption saved."}</p>
        <button className="btn-ghost btn-sm mt-2" onClick={() => copyText(text).then(() => toast("Caption copied"))} disabled={!text}>
          Copy caption
        </button>
      </div>
    </article>
  );
}
