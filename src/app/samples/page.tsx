"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SIZES, type SizeId } from "@/lib/constants";
import { sampleEvents } from "@/lib/sample";
import { toISO, todayIST, weekStart } from "@/lib/format";
import { buildSpecs } from "@/components/posters/specs";
import { Preview } from "@/components/posters/Preview";
import { downloadBlob, qrDataUrl, renderPng, toDataUrl } from "@/lib/export";
import { hash } from "@/lib/rng";

export default function SamplesPage() {
  const week = toISO(weekStart(todayIST()));
  const events = useMemo(() => sampleEvents(week), [week]);
  const [seed, setSeed] = useState(hash(week));
  const [size, setSize] = useState<SizeId>("post");
  const [only, setOnly] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<Record<string, string | null>>({});
  const [qrData, setQrData] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("seed")) setSeed(Number(p.get("seed")));
    if (p.get("size")) setSize(p.get("size") as SizeId);
    if (p.get("only")) setOnly(p.get("only"));
    toDataUrl("/samples/bokeh.jpg").then((d) => setPhotoData({ "/samples/bokeh.jpg": d }));
    Promise.all(events.map(async (e) => [e.id, await qrDataUrl(`https://example.com/rsvp/${e.id}`)] as const)).then((r) => setQrData(Object.fromEntries(r)));
  }, [events]);

  const specs = buildSpecs({ week, events, photos: [], seed, offsets: {}, photoData, qrData }).filter((s) => !only || s.key === only || s.template === only);

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-display text-3xl font-extrabold mr-auto">Sample posters</h1>
        {(Object.keys(SIZES) as SizeId[]).map((s) => (
          <button key={s} className={`chip ${size === s ? "chip-on" : ""}`} onClick={() => setSize(s)}>
            {SIZES[s].label}
          </button>
        ))}
        <button className="btn-primary" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
          Shuffle
        </button>
        <Link className="btn-ghost" href="/">
          Open the studio
        </Link>
      </div>
      <p className="text-mute mb-6 text-sm">Made-up events, so you can see the layouts. Seed {seed}.</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" id="grid">
        {specs.map((s) => (
          <div key={s.key} className="card p-3" data-key={s.key}>
            <Preview w={SIZES[size].w} h={SIZES[size].h}>
              {s.render(size)}
            </Preview>
            <div className="mt-3 flex items-start gap-2">
              <div className="mr-auto">
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-mute">{s.look}</div>
              </div>
              <button
                className="btn-ghost btn-sm"
                data-download={s.key}
                onClick={async () => downloadBlob(await renderPng(s.render(size), SIZES[size].w, SIZES[size].h), `${s.fileBase}-${size}.png`)}
              >
                PNG
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
