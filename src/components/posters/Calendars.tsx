"use client";
import type { CSSProperties } from "react";
import type { BrandId, LocationId, SizeId } from "@/lib/constants";
import { LOCATIONS } from "@/lib/constants";
import { BODY_FONT, HAND_FONT, type FontSet, type Palette } from "@/lib/themes";
import { weekRange } from "@/lib/format";
import { Scene, Sparkle } from "./Art";
import { FitBlock, FitText, Logos, ScaleGroup, displayStyle, type PosterEvent } from "./common";

export const CAL_TEMPLATES = ["timetable", "tiles", "list"] as const;
export type CalTemplate = (typeof CAL_TEMPLATES)[number];
export const JOINT_TEMPLATES = ["split", "columns"] as const;
export type JointTemplate = (typeof JOINT_TEMPLATES)[number];
export const CAL_NAMES: Record<string, string> = { timetable: "Timetable", tiles: "Tiles", list: "Menu board", split: "Split", columns: "Side by side" };

export interface CalProps {
  location: LocationId;
  brands: BrandId[];
  week: string;
  events: PosterEvent[];
  size: SizeId;
  w: number;
  h: number;
  pal: Palette;
  font: FontSet;
  seed: number;
}

function byDay(events: PosterEvent[]) {
  const map = new Map<string, PosterEvent[]>();
  for (const e of events) {
    if (!map.has(e.date)) map.set(e.date, []);
    map.get(e.date)!.push(e);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const base = (w: number, h: number, pal: Palette, extra?: CSSProperties): CSSProperties => ({
  width: w,
  height: h,
  background: pal.bg,
  color: pal.ink,
  fontFamily: BODY_FONT,
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  ...extra,
});

function Empty({ color }: { color: string }) {
  return <div style={{ fontSize: 40, textAlign: "center", padding: 60, color, opacity: 0.8 }}>Events coming soon ✨</div>;
}

function Footer({ events, color, size = 28 }: { events: PosterEvent[]; color: string; size?: number }) {
  const anyRsvp = events.some((e) => e.hasRsvp);
  return (
    <div style={{ fontSize: size, fontWeight: 600, color, textAlign: "center" }}>
      {anyRsvp ? "RSVP links in bio · DM us to save a spot" : "Everyone's welcome · just walk in"}
    </div>
  );
}

/* ───────────────────────── Timetable ───────────────────────── */
function Timetable({ location, brands, week, events, size, w, h, pal, font, seed }: CalProps) {
  const story = size === "story", sq = size === "square";
  const sceneH = story ? 470 : sq ? 240 : 330;
  const days = byDay(events);
  return (
    <div style={base(w, h, pal)}>
      <div style={{ height: sceneH, flexShrink: 0, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: "scaleY(-1)", opacity: 0 }} />
        <Scene location={location} variant={seed} pal={pal} w={w} h={sceneH} hotpot={brands.includes("hotpot")} />
        <div style={{ position: "absolute", top: sq ? 40 : 56, left: sq ? 56 : 72 }}>
          <Logos brands={brands} dark={pal.dark} height={sq ? 40 : 50} color={pal.ink} plate={pal.bg} />
        </div>
      </div>
      <div style={{ padding: sq ? "28px 56px 40px" : "44px 72px 56px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: sq ? 18 : 26 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <FitText max={story ? 120 : sq ? 76 : 96} min={44} maxLines={2} lineHeight={font.lineHeight} style={{ ...displayStyle(font, pal.ink), flex: 1 }}>
            {`This week in ${LOCATIONS[location].name}`}
          </FitText>
          <div style={{ background: pal.accent, color: pal.onAccent, borderRadius: 18, padding: "12px 22px", fontWeight: 800, fontSize: sq ? 30 : 38, whiteSpace: "nowrap" }}>{weekRange(week)}</div>
        </div>
        <FitBlock grow={1.4}>
          {days.length === 0 && <Empty color={pal.ink} />}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {days.map(([date, evs], i) => (
              <div key={date} style={{ display: "flex", gap: 28, padding: "22px 0", borderTop: i ? `3px solid ${pal.ink}22` : "none" }}>
                <div style={{ width: 150, flexShrink: 0 }}>
                  <div style={{ ...displayStyle(font, pal.accent2), fontSize: 50, lineHeight: 1 }}>{evs[0].dayShort}</div>
                  <div style={{ fontSize: 30, fontWeight: 600, marginTop: 6 }}>{evs[0].dateShort}</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
                  {evs.map((e) => (
                    <div key={e.id} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 44, lineHeight: 1 }}>{e.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{e.title}</div>
                        <div style={{ fontSize: 28, marginTop: 6, opacity: 0.9 }}>
                          {[e.startTime, e.venue.split(" · ")[0].replace(/, (Anjuna|Dharamkot)$/, ""), e.feeShort].filter(Boolean).join("  ·  ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FitBlock>
        <Footer events={events} color={pal.ink} size={sq ? 24 : 28} />
      </div>
    </div>
  );
}

/* ───────────────────────── Tiles ───────────────────────── */
function Tiles({ location, brands, week, events, size, w, h, pal, font, seed }: CalProps) {
  const story = size === "story", sq = size === "square";
  const sorted = [...events].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const cols = sq && sorted.length > 4 ? 3 : 2;
  const tileColors: [string, string][] = [
    [pal.accent, pal.onAccent],
    [pal.paper, pal.paperInk],
    [pal.accent2, pal.paper],
    [pal.paper, pal.paperInk],
  ];
  return (
    <div style={base(w, h, pal, { padding: sq ? "48px 52px 36px" : "64px 64px 48px", gap: sq ? 20 : 30 })}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logos brands={brands} dark={pal.dark} height={sq ? 44 : 56} color={pal.ink} />
        <div style={{ fontFamily: HAND_FONT, fontSize: sq ? 40 : 52, fontWeight: 700 }}>{LOCATIONS[location].place}</div>
      </div>
      <div>
        <div style={{ fontFamily: HAND_FONT, fontSize: story ? 64 : 48, fontWeight: 700, color: pal.accent, lineHeight: 1 }}>what&apos;s on this week</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 6 }}>
          <div style={{ ...displayStyle(font, pal.ink), fontSize: story ? 130 : sq ? 80 : 104, lineHeight: 0.95 }}>{weekRange(week)}</div>
          <Sparkle size={sq ? 44 : 60} color={pal.accent2} />
        </div>
      </div>
      <FitBlock grow={1.4}>
        {sorted.length === 0 && <Empty color={pal.ink} />}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 22 }}>
          {sorted.map((e, i) => {
            const [bg, fg] = tileColors[(i + seed) % tileColors.length];
            return (
              <div key={e.id} style={{ background: bg, color: fg, borderRadius: 30, padding: "26px 28px", display: "flex", flexDirection: "column", gap: 10, minHeight: 250, transform: `rotate(${((i * 7 + seed) % 5) - 2}deg)` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 30 }}>
                    {e.dayShort} {e.dateShort}
                  </div>
                  <div style={{ fontSize: 50, lineHeight: 1 }}>{e.emoji}</div>
                </div>
                <div style={{ ...displayStyle(font, fg), fontSize: 50, lineHeight: font.lineHeight, marginTop: 4 }}>{e.title}</div>
                <div style={{ marginTop: "auto", fontSize: 26, fontWeight: 600, opacity: 0.92 }}>
                  {[e.startTime, e.feeShort].filter(Boolean).join(" · ")}
                </div>
              </div>
            );
          })}
        </div>
      </FitBlock>
      <Footer events={events} color={pal.ink} size={sq ? 24 : 28} />
    </div>
  );
}

/* ───────────────────────── Menu board (list) ───────────────────────── */
function List({ location, brands, week, events, size, w, h, pal, font, seed }: CalProps) {
  const story = size === "story", sq = size === "square";
  const sorted = [...events].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const sceneH = story ? 420 : sq ? 210 : 300;
  return (
    <div style={base(w, h, pal, { padding: sq ? "52px 56px 0" : "68px 72px 0" })}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Logos brands={brands} dark={pal.dark} height={sq ? 44 : 56} color={pal.ink} />
      </div>
      <div style={{ textAlign: "center", marginTop: sq ? 22 : 40 }}>
        <div style={{ ...displayStyle(font, pal.accent), fontSize: story ? 150 : sq ? 90 : 120, lineHeight: 0.92 }}>The week ahead</div>
        <div style={{ fontSize: story ? 40 : 32, fontWeight: 700, marginTop: 14 }}>
          {LOCATIONS[location].place} · {weekRange(week)}
        </div>
      </div>
      <div style={{ height: 4, background: pal.ink, margin: sq ? "24px 0 18px" : "40px 0 26px", borderRadius: 2 }} />
      <FitBlock grow={1.4}>
        {sorted.length === 0 && <Empty color={pal.ink} />}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {sorted.map((e) => (
            <div key={e.id}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 32, color: pal.accent2, width: 170, flexShrink: 0 }}>
                  {e.dayShort} {e.dateShort.split(" ")[0]}
                </div>
                <div style={{ ...displayStyle(font, pal.ink), fontSize: 46, lineHeight: 1.05 }}>
                  {e.title} <span style={{ fontSize: 40 }}>{e.emoji}</span>
                </div>
                <div style={{ flex: 1, borderBottom: `4px dotted ${pal.ink}66`, transform: "translateY(-10px)", minWidth: 30 }} />
                <div style={{ fontWeight: 800, fontSize: 32, whiteSpace: "nowrap" }}>{e.feeShort}</div>
              </div>
              <div style={{ marginLeft: 184, fontSize: 26, opacity: 0.85, marginTop: 4 }}>
                {[e.time, e.venue.split(" · ")[0]].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </FitBlock>
      <div style={{ padding: "18px 0 10px" }}>
        <Footer events={events} color={pal.ink} size={sq ? 22 : 26} />
      </div>
      <div style={{ marginLeft: sq ? -56 : -72, marginRight: sq ? -56 : -72, height: sceneH, flexShrink: 0 }}>
        <Scene location={location} variant={seed + 1} pal={pal} w={w} h={sceneH} />
      </div>
    </div>
  );
}

export function LocationCalendar({ template, ...p }: CalProps & { template: CalTemplate }) {
  if (template === "tiles") return <Tiles {...p} />;
  if (template === "list") return <List {...p} />;
  return <Timetable {...p} />;
}

/* ───────────────────────── Joint calendar ───────────────────────── */
export interface JointProps {
  week: string;
  goa: PosterEvent[];
  dharamkot: PosterEvent[];
  size: SizeId;
  w: number;
  h: number;
  goaPal: Palette;
  dkPal: Palette;
  font: FontSet;
  seed: number;
  brands: BrandId[];
}

function MiniList({ events, pal, font, compact, s = 1 }: { events: PosterEvent[]; pal: Palette; font: FontSet; compact?: boolean; s?: number }) {
  const sorted = [...events].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  if (!sorted.length) return <Empty color={pal.ink} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: (compact ? 16 : 20) * s }}>
      {sorted.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 18 * s, alignItems: "center" }}>
          <div style={{ width: 112 * s, flexShrink: 0, background: pal.paper, color: pal.paperInk, borderRadius: 16 * s, textAlign: "center", padding: `${8 * s}px 0` }}>
            <div style={{ fontSize: 23 * s, fontWeight: 700 }}>{e.dayShort}</div>
            <div style={{ ...displayStyle(font, pal.paperInk), fontSize: 44 * s, lineHeight: 1, textTransform: "none" }}>{e.dayNum}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 37 * s, fontWeight: 800, lineHeight: 1.1 }}>
              {e.emoji} {e.title}
            </div>
            <div style={{ fontSize: 26 * s, marginTop: 6 * s, opacity: 0.9 }}>{[e.startTime, e.feeShort].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Split({ week, goa, dharamkot, size, w, h, goaPal, dkPal, font, seed, brands }: JointProps) {
  const story = size === "story", sq = size === "square";
  const head = story ? 340 : sq ? 200 : 250;
  // one text size for both lists, chosen from the longer list, so the two halves match
  const rows = Math.max(goa.length, dharamkot.length, 1);
  const avail = ((h - head) / 2) - (sq ? 110 : 140);
  const s = Math.max(0.55, Math.min(story ? 1.2 : 1.05, avail / (rows * 112)));
  const artW = story ? 330 : sq ? 0 : 300;
  const section = (loc: LocationId, evs: PosterEvent[], pal: Palette, variant: number) => (
    <div style={{ flex: 1, minHeight: 0, background: pal.bg, color: pal.ink, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, minWidth: 0, padding: sq ? "24px 0 18px 52px" : "34px 0 26px 64px", display: "flex", flexDirection: "column", gap: sq ? 12 : 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ ...displayStyle(font, pal.accent), fontSize: sq ? 54 : 68, lineHeight: 1 }}>{LOCATIONS[loc].name}</div>
          <div style={{ fontFamily: HAND_FONT, fontSize: sq ? 32 : 40, fontWeight: 700 }}>{loc === "goa" ? "Anjuna" : "Himachal"}</div>
        </div>
        <FitBlock origin="top left">
          <MiniList events={evs} pal={pal} font={font} compact={sq} s={s} />
        </FitBlock>
      </div>
      {artW > 0 ? (
        <div style={{ width: artW, flexShrink: 0, margin: story ? "34px 40px 34px 28px" : "28px 40px 28px 24px", borderRadius: 28, overflow: "hidden" }}>
          <Scene location={loc} variant={variant} pal={pal} w="100%" h="100%" />
        </div>
      ) : (
        <div style={{ width: 52 }} />
      )}
    </div>
  );
  const headPal = seed % 2 ? goaPal : dkPal;
  return (
    <div style={base(w, h, headPal, { background: "#FFFFFF" })}>
      <div style={{ height: head, flexShrink: 0, background: headPal.paper, color: headPal.paperInk, padding: sq ? "34px 52px 26px" : "48px 64px 34px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <Logos brands={brands} dark={false} height={sq ? 42 : 52} color={headPal.paperInk} />
          <div style={{ fontWeight: 800, fontSize: sq ? 28 : 34, whiteSpace: "nowrap", background: headPal.paperInk, color: headPal.paper, padding: "10px 20px", borderRadius: 14 }}>{weekRange(week)}</div>
        </div>
        <FitText max={story ? 120 : sq ? 76 : 96} min={48} maxLines={story ? 2 : 1} lineHeight={0.98} style={{ ...displayStyle(font, headPal.paperInk), width: "100%" }}>
          This week at NomadGao
        </FitText>
      </div>
      <ScaleGroup>
        {section("goa", goa, goaPal, seed)}
        {section("dharamkot", dharamkot, dkPal, seed + 1)}
      </ScaleGroup>
    </div>
  );
}

function Columns({ week, goa, dharamkot, size, w, h, goaPal, dkPal, font, seed, brands }: JointProps) {
  const story = size === "story", sq = size === "square";
  const colRows = Math.max(goa.length, dharamkot.length, 1);
  const colS = story ? Math.max(0.6, Math.min(1.05, 760 / ((goa.length + dharamkot.length || 1) * 116))) : Math.min(sq ? 0.75 : 0.85, (sq ? 440 : 600) / (colRows * 120));
  const stacked = story;
  const card = (loc: LocationId, evs: PosterEvent[], pal: Palette, variant: number) => (
    <div style={{ flex: stacked ? `${Math.max(evs.length, 1) + 2.2} 1 0` : 1, minHeight: 0, minWidth: 0, background: pal.bg, color: pal.ink, borderRadius: 34, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: stacked ? 230 : sq ? 170 : 230, flexShrink: 0, position: "relative" }}>
        <Scene location={loc} variant={variant} pal={pal} w="100%" h="100%" band />
        <div style={{ position: "absolute", left: 24, top: 20, ...displayStyle(font, pal.ink), fontSize: sq ? 44 : 54, lineHeight: 1, background: pal.bg, padding: "8px 16px 10px", borderRadius: 14 }}>{LOCATIONS[loc].name}</div>
      </div>
      <div style={{ padding: sq ? "18px 24px 22px" : "24px 30px 30px", flex: 1, minHeight: 0, display: "flex" }}>
        <FitBlock grow={1.4}>
          <MiniList events={evs} pal={pal} font={font} compact />
        </FitBlock>
      </div>
    </div>
  );
  const bg = "#F2EFE6";
  return (
    <div style={{ ...base(w, h, goaPal), background: bg, color: "#1d1d1b", padding: sq ? "44px 44px 36px" : "60px 60px 48px", gap: sq ? 22 : 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logos brands={brands} dark={false} height={sq ? 42 : 54} color="#1d1d1b" />
        <div style={{ fontWeight: 800, fontSize: sq ? 28 : 34 }}>{weekRange(week)}</div>
      </div>
      <div style={{ ...displayStyle(font, "#1d1d1b"), fontSize: story ? 120 : sq ? 70 : 92, lineHeight: 0.95 }}>
        Two places,
        <br />
        one tribe.
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: stacked ? "column" : "row", gap: sq ? 20 : 28 }}>
        <ScaleGroup>
          {card("goa", goa, goaPal, seed)}
          {card("dharamkot", dharamkot, dkPal, seed + 2)}
        </ScaleGroup>
      </div>
      <Footer events={[...goa, ...dharamkot]} color="#1d1d1b" size={sq ? 22 : 26} />
    </div>
  );
}

export function JointCalendar({ template, ...p }: JointProps & { template: JointTemplate }) {
  return template === "columns" ? <Columns {...p} /> : <Split {...p} />;
}
