"use client";
/**
 * Weekly calendars in the same three styles as the event posters, so Shuffle on a calendar
 * moves it between Postcard, Polaroid and Cover too. Works for one location or both (joint).
 */
import type { LocationId, SizeId } from "@/lib/constants";
import { FitBlock, Logos, type PosterEvent } from "../common";
import { Box, frame, Grain, logoH, placeShort, shortVenue } from "./kit";
import { INKS, Shape, cond, mono, nnum } from "./DirC";
import type { MixLayout } from "./DirD";

export interface CalSection {
  loc: LocationId;
  events: PosterEvent[];
}

type Inks = { a: string; b: string; paper: string };

function Rows({ sections, text, rule, chipText, small, joint, onInk }: { sections: CalSection[]; text: string; rule: string; chipText: (loc: LocationId) => string; small: boolean; joint: boolean; onInk?: boolean }) {
  return (
    <div style={{ paddingBottom: 18 }}>
      {sections.map((sec) => {
        const k = INKS[sec.loc];
        return (
          <div key={sec.loc} style={{ marginTop: joint ? 18 : 0 }}>
            {joint && <div style={{ ...mono(24), display: "inline-block", background: onInk ? k.paper : k.b, color: onInk ? k.b : k.paper, padding: "4px 12px", marginBottom: 4 }}>{placeShort(sec.loc)}</div>}
            {sec.events.map((e) => {
              const ek = e.brands.includes("hotpot") ? INKS.hotpot : k;
              return (
                <div key={e.id} style={{ padding: `${small ? 11 : 15}px 0`, borderBottom: `2px dashed ${rule}`, color: text }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                    <span style={{ ...mono(small ? 23 : 27), background: ek.a, color: chipText(sec.loc), padding: "2px 8px", flexShrink: 0 }}>
                      {e.dayShort} {nnum(e.date)}
                    </span>
                    <span style={{ ...cond(), fontSize: small ? 52 : 64, lineHeight: 0.95, width: "auto", flex: 1 }}>{e.title}</span>
                  </div>
                  <div style={{ ...mono(small ? 21 : 24), marginTop: 6, opacity: 0.85 }}>
                    {e.startTime} · {shortVenue(e).split(",")[0]} · {e.feeShort}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function hasHotpot(sections: CalSection[]) {
  return sections.some((s) => s.events.some((e) => e.brands.includes("hotpot")));
}

function Footer({ sections, size, color, note }: { sections: CalSection[]; size: SizeId; color: string; note: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${color}`, paddingTop: 14, flexShrink: 0, position: "relative", zIndex: 2 }}>
      <Logos brands={hasHotpot(sections) ? ["hotpot", "nomadgao"] : ["nomadgao"]} dark={false} height={logoH(size)} gap={14} color={color} />
      <span style={{ ...mono(22), color }}>{note}</span>
    </div>
  );
}

const placeWord = (sections: CalSection[]) => (sections.length > 1 ? "Anjuna & Dharamkot" : sections[0].loc === "goa" ? "Anjuna" : "Dharamkot");
const shapeFor = (sections: CalSection[]) => (sections.length > 1 ? "sun" : sections[0].loc === "goa" ? "sun" : "peak");

/* ───────────── Postcard calendar ───────────── */
function PostcardCal({ sections, range, size, title, k }: Props & { k: Inks }) {
  const fr = frame(size);
  const sq = size === "square";
  const joint = sections.length > 1;
  const frontH = size === "story" ? 420 : sq ? 210 : 290;
  return (
    <Box size={size} bg={k.paper} color={k.b}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", gap: sq ? 14 : 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono(sq ? 22 : 26), borderBottom: `2px solid ${k.b}`, paddingBottom: 12, flexShrink: 0 }}>
          <span>{joint ? "NomadGao weekly" : `NomadGao · ${placeShort(sections[0].loc)}`}</span>
          <span>{range}</span>
        </div>
        <div style={{ display: "flex", gap: 22, flexShrink: 0 }}>
          <div style={{ flex: 1, height: frontH, background: "#FFFEFA", padding: 12, boxShadow: `0 0 0 2px ${k.b}` }}>
            <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: k.paper }}>
              <Shape kind={shapeFor(sections)} color={k.a} w={fr.w - fr.padX * 2 - 230} h={frontH - 24} />
              <div style={{ position: "absolute", left: 0, bottom: 0, background: k.b, color: k.paper, padding: sq ? "10px 16px" : "14px 22px" }}>
                <div style={{ ...mono(sq ? 18 : 22), opacity: 0.9 }}>{title} · greetings from</div>
                <div style={{ ...cond(), width: "auto", fontSize: sq ? 56 : joint ? 62 : 80, lineHeight: 0.9, color: k.paper, textShadow: `4px 3px 0 ${k.a}` }}>{placeWord(sections)}</div>
              </div>
            </div>
          </div>
          <div style={{ width: sq ? 170 : 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ aspectRatio: "4 / 5", maxHeight: frontH - 70, background: k.a, boxShadow: `0 0 0 3px ${k.paper}, 0 0 0 5px ${k.b}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(2deg)", ...cond(), width: "100%", fontSize: sq ? 44 : 54, lineHeight: 0.9, textAlign: "center", color: k.b }}>
              {range.replace(" ", " ")}
            </div>
          </div>
        </div>
        <FitBlock origin="top left" grow={size === "story" ? 1.7 : 1.35}>
          <Rows sections={sections} text={k.b} rule={`${k.b}66`} chipText={(loc) => INKS[loc].b} small={(joint && size !== "story") || sq} joint={joint} />
        </FitBlock>
        <Footer sections={sections} size={size} color={k.b} note="RSVP: link in bio" />
      </div>
      <Grain opacity={0.18} />
    </Box>
  );
}

/* ───────────── Polaroid calendar ───────────── */
function PolaroidCal({ sections, range, size, title, k, photo }: Props & { k: Inks }) {
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const joint = sections.length > 1;
  const pw = story ? 470 : sq ? 300 : 380;
  const ph = story ? 420 : sq ? 230 : 300;
  return (
    <Box size={size} bg={k.paper} color={k.b}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", gap: sq ? 14 : 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono(sq ? 22 : 26), borderBottom: `2px solid ${k.b}`, paddingBottom: 12, flexShrink: 0 }}>
          <span>{joint ? "NomadGao weekly" : `NomadGao · ${placeShort(sections[0].loc)}`}</span>
          <span>{placeWord(sections)}</span>
        </div>
        <div style={{ display: "flex", gap: sq ? 28 : 40, alignItems: "center", flexShrink: 0, paddingTop: 8 }}>
          <div style={{ width: pw, flexShrink: 0, background: "#FFFEFA", padding: "14px 14px 0", boxShadow: "0 14px 30px rgba(30,30,30,.2)", transform: "rotate(-3deg)", position: "relative" }}>
            <div style={{ position: "absolute", top: -18, left: "50%", width: 150, height: 40, marginLeft: -75, background: k.a, opacity: 0.85, transform: "rotate(3deg)" }} />
            <div style={{ height: ph, overflow: "hidden", position: "relative", background: k.paper }}>
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <Shape kind={shapeFor(sections)} color={k.b} w={pw - 28} h={ph} />
              )}
            </div>
            <div style={{ height: sq ? 52 : 64, display: "flex", alignItems: "center", ...mono(sq ? 18 : 22), color: "#3A3A3A" }}>Week of {range}</div>
          </div>
          <div style={{ ...cond(), width: "auto", flex: 1, fontSize: story ? 150 : sq ? 96 : 120, lineHeight: 0.86, color: k.b, textShadow: `5px 4px 0 ${k.a}` }}>{title}</div>
        </div>
        <FitBlock origin="top left" grow={size === "story" ? 1.7 : 1.35}>
          <Rows sections={sections} text={k.b} rule={`${k.b}66`} chipText={(loc) => INKS[loc].b} small={(joint && size !== "story") || sq} joint={joint} />
        </FitBlock>
        <Footer sections={sections} size={size} color={k.b} note="RSVP: link in bio" />
      </div>
      <Grain opacity={0.16} />
    </Box>
  );
}

/* ───────────── Cover calendar ───────────── */
function CoverCal({ sections, range, size, title, k }: Props & { k: Inks }) {
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const joint = sections.length > 1;
  const topH = story ? 640 : sq ? 300 : 400;
  return (
    <Box size={size} bg={k.b} color={k.paper}>
      <div style={{ height: topH, position: "relative", overflow: "hidden", flexShrink: 0, background: k.paper }}>
        <Shape kind={shapeFor(sections)} color={k.a} w={fr.w} h={topH} />
        <div style={{ position: "absolute", left: fr.padX, right: fr.padX, top: story ? fr.padTop + 10 : fr.padTop - 24, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <Logos brands={hasHotpot(sections) ? ["hotpot", "nomadgao"] : ["nomadgao"]} dark={false} height={logoH(size) - 10} gap={14} color={k.b} plate={k.paper} />
          <span style={{ ...mono(sq ? 20 : 24), background: k.a, color: k.b, padding: "6px 12px", transform: "rotate(2deg)" }}>{range}</span>
        </div>
        <div style={{ position: "absolute", left: fr.padX, right: fr.padX, bottom: 22, ...cond(), fontSize: story ? 170 : sq ? 110 : 140, lineHeight: 0.84, color: k.b }}>{title}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: `${sq ? 18 : 26}px ${fr.padX}px ${story ? fr.padBottom : sq ? 40 : 54}px` }}>
        <div style={{ ...mono(sq ? 20 : 24), color: k.a, marginBottom: 4 }}>
          {placeWord(sections)} · RSVP: link in bio
        </div>
        <FitBlock origin="top left" grow={size === "story" ? 1.7 : 1.35}>
          <Rows sections={sections} text={k.paper} rule={`${k.paper}55`} chipText={(loc) => INKS[loc].b} small={(joint && size !== "story") || sq} joint={joint} onInk />
        </FitBlock>
      </div>
      <Grain opacity={0.2} />
    </Box>
  );
}

interface Props {
  sections: CalSection[];
  range: string;
  size: SizeId;
  title: string;
  photo?: string | null;
}

export const MIX_CAL_TITLES = ["This week", "What's on", "Week ahead"] as const;

export function MixCalendar({ layout, ...p }: Props & { layout: MixLayout }) {
  const joint = p.sections.length > 1;
  const k: Inks = joint ? { ...INKS.goa } : INKS[p.sections[0].loc];
  if (layout === "postcard") return <PostcardCal {...p} k={k} />;
  if (layout === "polaroid") return <PolaroidCal {...p} k={k} />;
  return <CoverCal {...p} k={k} />;
}
