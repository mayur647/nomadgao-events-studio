"use client";
import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { BrandId, LocationId, SizeId } from "@/lib/constants";
import { BRANDS, LOCATIONS, eventType } from "@/lib/constants";
import type { Palette, FontSet } from "@/lib/themes";
import { BODY_FONT } from "@/lib/themes";
import type { EventRow } from "@/lib/types";
import { dateShort, dayName, dayNum, feeShort, feeText, monthShort, rsvpLine, time12, timeRange, venueLine } from "@/lib/format";

/* ───────────────────────── data prepared for posters ───────────────────────── */
export interface PosterEvent {
  id: string;
  location: LocationId;
  brands: BrandId[];
  title: string;
  typeName: string;
  typeSlug: string;
  emoji: string;
  date: string;
  day: string;
  dayShort: string;
  dayNum: string;
  month: string;
  dateShort: string;
  time: string;
  startTime: string;
  venue: string;
  fee: string;
  feeShort: string;
  feeNote: string | null;
  isFree: boolean;
  rsvp: string;
  hasRsvp: boolean;
  host: string | null;
  description: string | null;
  bring: string | null;
  badges: string[];
}

export function toPosterEvent(e: EventRow): PosterEvent {
  const t = eventType(e.event_type);
  const badges: string[] = [];
  if (e.audience === "residents") badges.push("Residents only");
  else badges.push("Open to all");
  if (e.byob) badges.push("BYOB");
  if (e.limited_seats) badges.push(e.capacity ? `Only ${e.capacity} seats` : "Limited seats");
  return {
    id: e.id,
    location: e.location,
    brands: e.brands?.length ? e.brands : ["nomadgao"],
    title: e.name,
    typeName: t.name,
    typeSlug: e.event_type,
    emoji: t.emoji,
    date: e.event_date,
    day: dayName(e.event_date),
    dayShort: dayName(e.event_date, true),
    dayNum: dayNum(e.event_date),
    month: monthShort(e.event_date),
    dateShort: dateShort(e.event_date),
    time: timeRange(e),
    startTime: time12(e.start_time),
    venue: venueLine(e),
    fee: feeText(e),
    feeShort: feeShort(e),
    feeNote: e.fee_type !== "custom" ? e.fee_note : null,
    isFree: e.fee_type === "free",
    rsvp: rsvpLine(e),
    hasRsvp: e.rsvp_mode !== "none",
    host: e.host,
    description: e.description,
    bring: e.what_to_bring,
    badges,
  };
}

export interface PosterProps {
  ev: PosterEvent;
  size: SizeId;
  w: number;
  h: number;
  pal: Palette;
  font: FontSet;
  seed: number;
  photo: string | null;
  qr: string | null;
}

/* ───────────────────────── text fitting ───────────────────────── */
function useFontsVersion() {
  const [v, setV] = useState(0);
  useLayoutEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && setV((x) => x + 1));
    const on = () => alive && setV((x) => x + 1);
    document.fonts?.addEventListener?.("loadingdone", on);
    return () => {
      alive = false;
      document.fonts?.removeEventListener?.("loadingdone", on);
    };
  }, []);
  return v;
}

/** Text that shrinks until it fits `maxLines` lines in its width. */
export function FitText({
  children,
  max,
  min = 28,
  maxLines = 3,
  lineHeight = 1,
  style,
}: {
  children: string;
  max: number;
  min?: number;
  maxLines?: number;
  lineHeight?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fv = useFontsVersion();
  const [size, setSize] = useState(max);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let s = max;
    el.style.fontSize = `${s}px`;
    while (s > min && (el.scrollHeight > maxLines * lineHeight * s + s * 0.3 + 4 || el.scrollWidth > el.clientWidth + 2)) {
      s -= 2;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
  }, [children, max, min, maxLines, lineHeight, fv, style?.fontFamily, style?.textTransform]);
  return (
    <div ref={ref} style={{ ...style, fontSize: size, lineHeight, overflowWrap: "normal", wordBreak: "normal" }}>
      {children}
    </div>
  );
}

/** Blocks inside one ScaleGroup all use the smallest scale any of them needs, so side-by-side lists match. */
const ScaleCtx = createContext<{ report: (id: string, s: number) => void; min: number } | null>(null);
export function ScaleGroup({ children }: { children: ReactNode }) {
  const [scales, setScales] = useState<Record<string, number>>({});
  const report = useCallback((id: string, v: number) => setScales((x) => (Math.abs((x[id] ?? -1) - v) < 0.004 ? x : { ...x, [id]: v })), []);
  const vals = Object.values(scales);
  const min = vals.length ? Math.min(...vals) : 1;
  return <ScaleCtx.Provider value={{ report, min }}>{children}</ScaleCtx.Provider>;
}

/** A block that scales its content down to fit the space it is given. */
export function FitBlock({ children, style, origin = "top center", grow = 1 }: { children: ReactNode; style?: CSSProperties; origin?: string; grow?: number }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const fv = useFontsVersion();
  const [own, setScale] = useState(1);
  const group = useContext(ScaleCtx);
  const gid = useId();
  const scale = group ? Math.min(own, group.min) : own;
  const report = group?.report;
  useLayoutEffect(() => {
    report?.(gid, own);
  }, [report, gid, own]);
  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const prev = [i.style.transform, i.style.width, i.style.marginLeft];
    i.style.transform = "none";
    i.style.marginLeft = "0";
    const avail = o.clientHeight;
    let s = 1;
    for (let k = 0; k < 5; k++) {
      i.style.width = `${100 / s}%`;
      const need = i.scrollHeight;
      if (avail <= 0) break;
      const next = Math.max(0.35, Math.min(grow, avail / need));
      if (Math.abs(next - s) < 0.004) {
        s = next;
        break;
      }
      s = next;
    }
    // make sure the final scale really fits (growing can make text wrap more)
    for (let k = 0; k < 40; k++) {
      i.style.width = `${100 / s}%`;
      if (avail <= 0 || i.scrollHeight * s <= avail + 1 || s <= 0.35) break;
      s = Math.max(0.35, s - 0.02);
    }
    s = Math.floor(s * 1000) / 1000;
    [i.style.transform, i.style.width, i.style.marginLeft] = prev;
    if (Math.abs(s - own) > 0.004) setScale(s);
  });
  void fv;
  return (
    <div ref={outer} style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", ...style }}>
      <div
        ref={inner}
        style={{ transform: scale !== 1 ? `scale(${scale})` : "none", transformOrigin: origin, width: scale !== 1 ? `${100 / scale}%` : "100%", marginLeft: scale !== 1 && origin.includes("center") ? `${-(100 / scale - 100) / 2}%` : 0 }}
      >
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── brand marks ───────────────────────── */
export function Logos({ brands, dark, height = 64, gap = 22, color, plate }: { brands: BrandId[]; dark: boolean; height?: number; gap?: number; color: string; plate?: string }) {
  const hasN = brands.includes("nomadgao");
  const hasH = brands.includes("hotpot");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        // over artwork or photos the logos sit on a solid plate so they never disappear
        ...(plate ? { background: plate, padding: `${height * 0.3}px ${height * 0.5}px`, borderRadius: height * 0.6, boxShadow: "0 4px 14px rgba(0,0,0,.12)" } : {}),
      }}
    >
      {hasH && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/hotpot-house.png" alt="The Hotpot House" style={{ height: height * 1.35, width: height * 1.35, borderRadius: "50%", display: "block", boxShadow: `0 0 0 3px ${color}22` }} />
      )}
      {hasH && hasN && <span style={{ fontFamily: BODY_FONT, fontSize: height * 0.55, fontWeight: 300, color, opacity: 0.8 }}>×</span>}
      {hasN && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dark ? "/brand/nomadgao-white.png" : "/brand/nomadgao-dark.png"} alt="NomadGao" style={{ height: height, width: (height * 800) / 208, display: "block" }} />
      )}
    </div>
  );
}

export function brandLine(brands: BrandId[]) {
  return brands.map((b) => BRANDS[b].name).join(" × ");
}

export function placeName(loc: LocationId) {
  return LOCATIONS[loc].place;
}

/* ───────────────────────── small UI atoms ───────────────────────── */
export function Pill({ children, bg, fg, size = 30, style }: { children: ReactNode; bg: string; fg: string; size?: number; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.35,
        background: bg,
        color: fg,
        fontFamily: BODY_FONT,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        padding: `${size * 0.42}px ${size * 0.7}px`,
        borderRadius: 999,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function QRBox({ qr, size = 210, label, bg = "#fff", fg = "#111", style }: { qr: string; size?: number; label?: string; bg?: string; fg?: string; style?: CSSProperties }) {
  return (
    <div style={{ background: bg, borderRadius: 22, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 10px 30px rgba(0,0,0,.18)", ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="" width={size} height={size} style={{ display: "block" }} />
      {label && <div style={{ fontFamily: BODY_FONT, fontWeight: 700, fontSize: size * 0.11, color: fg }}>{label}</div>}
    </div>
  );
}

export function Badges({ items, color, size = 28 }: { items: string[]; color: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {items.map((b) => (
        <span key={b} style={{ border: `2.5px solid ${color}`, color, borderRadius: 999, padding: `${size * 0.3}px ${size * 0.6}px`, fontFamily: BODY_FONT, fontWeight: 600, fontSize: size, lineHeight: 1, whiteSpace: "nowrap" }}>
          {b}
        </span>
      ))}
    </div>
  );
}

/** Icon + text lines for when/where/entry. */
export function InfoLines({ ev, color, size = 36, gap = 14, show = ["when", "where", "fee"] }: { ev: PosterEvent; color: string; size?: number; gap?: number; show?: ("when" | "where" | "fee" | "host" | "bring")[] }) {
  const rows: [string, string][] = [];
  if (show.includes("when")) rows.push(["🗓", `${ev.day}, ${ev.dateShort}${ev.time ? `  ·  ${ev.time}` : ""}`]);
  if (show.includes("where")) rows.push(["📍", ev.venue]);
  if (show.includes("fee")) rows.push(["🎟", ev.feeNote ? `${ev.fee} · ${ev.feeNote}` : ev.fee]);
  if (show.includes("host") && ev.host) rows.push(["🙋", `Hosted by ${ev.host}`]);
  if (show.includes("bring") && ev.bring) rows.push(["🎒", `Bring: ${ev.bring}`]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, fontFamily: BODY_FONT, color, fontSize: size, lineHeight: 1.2, fontWeight: 500 }}>
      {rows.map(([i, t]) => (
        <div key={i} style={{ display: "flex", gap: size * 0.45, alignItems: "flex-start" }}>
          <span style={{ width: size * 1.1, flexShrink: 0, textAlign: "center" }}>{i}</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

export function displayStyle(font: FontSet, color: string): CSSProperties {
  return {
    fontFamily: font.display,
    fontWeight: font.displayWeight,
    letterSpacing: font.tracking,
    textTransform: font.displayCase,
    color,
  };
}
