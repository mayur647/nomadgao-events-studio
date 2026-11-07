"use client";
import { useEffect, useMemo, useState } from "react";
import type { LocationId, SizeId } from "@/lib/constants";
import { sampleEvents } from "@/lib/sample";
import { weekRange } from "@/lib/format";
import { qrDataUrl } from "@/lib/export";
import { toPosterEvent } from "@/components/posters/common";
import { CalA, EventA, JointA } from "@/components/posters/v2/DirA";
import { CalB, EventB, JointB } from "@/components/posters/v2/DirB";
import { CalC, EventC, JointC } from "@/components/posters/v2/DirC";
import { MixPoster, type MixLayout } from "@/components/posters/v2/DirD";

/** Design lab: renders one new-direction poster at full size. /lab?d=A&k=event&i=0&size=post&photo=1 */
const WEEK = "2026-11-09";
const PHOTOS = ["/samples/warm.jpg", "/samples/bokeh.jpg", "/samples/bright.jpg"];

export default function Lab() {
  const [q, setQ] = useState<URLSearchParams | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    setQ(new URLSearchParams(window.location.search));
    qrDataUrl("https://nomadgao-events-studio.vercel.app/rsvp/sample").then(setQr);
  }, []);
  const evs = useMemo(() => sampleEvents(WEEK).map(toPosterEvent).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)), []);
  if (!q || !qr) return null;
  const d = q.get("d") ?? "A";
  const k = q.get("k") ?? "event";
  const size = (q.get("size") ?? "post") as SizeId;
  const i = Number(q.get("i") ?? 0);
  const loc = (q.get("loc") ?? "goa") as LocationId;
  const photo = q.get("photo") === "1" ? PHOTOS[i % 3] : null;
  const ev = sampleEvents(WEEK).map(toPosterEvent)[i];
  const range = weekRange(WEEK);
  const goa = evs.filter((e) => e.location === "goa");
  const dk = evs.filter((e) => e.location === "dharamkot");
  const locEvs = loc === "goa" ? goa : dk;
  const layout = (q.get("l") ?? "postcard") as MixLayout;
  const Mix = (p: Parameters<typeof EventC>[0]) => <MixPoster layout={layout} {...p} />;
  const E = { A: EventA, B: EventB, C: EventC, D: Mix }[d]!;
  const C = { A: CalA, B: CalB, C: CalC, D: CalC }[d]!;
  const J = { A: JointA, B: JointB, C: JointC, D: JointC }[d]!;
  return (
    <div id="poster" style={{ display: "inline-block" }}>
      {k === "event" && <E ev={ev} size={size} photo={photo} qr={qr} />}
      {k === "cal" && <C location={loc} events={locEvs} range={range} size={size} photo={q.get("photo") === "1" ? PHOTOS[0] : null} />}
      {k === "joint" && <J goa={goa} dharamkot={dk} range={range} size={size} />}
    </div>
  );
}
