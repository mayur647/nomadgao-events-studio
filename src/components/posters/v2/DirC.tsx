"use client";
/**
 * Direction C — "Printed matter". Two-ink risograph look on paper (Subko's printed ephemera,
 * Ace's riso calendars, the 2026 gig-flyer revival). Condensed headline + mono "programme" details.
 * Each place owns one shape: Goa = the sun, Dharamkot = the peak, Hotpot House = the pot.
 */
import type { LocationId, SizeId } from "@/lib/constants";
import { FitBlock, FitText, Logos, type PosterEvent } from "../common";
import { Box, f, frame, Grain, logoH, placeShort, shortVenue } from "./kit";

export const INKS: Record<LocationId | "hotpot", { a: string; b: string; paper: string }> = {
  goa: { a: "#FF6B4A", b: "#0B5A8C", paper: "#F3EDE2" }, // sunset coral + Arabian Sea blue
  dharamkot: { a: "#E9A23B", b: "#2E4F3E", paper: "#F1EEE6" }, // monk saffron + deodar green
  hotpot: { a: "#F2C14E", b: "#B8262A", paper: "#F7F1E3" }, // broth yellow + chili red
};
export const inksFor = (ev: { brands: string[]; location: LocationId }) => (ev.brands.includes("hotpot") ? INKS.hotpot : INKS[ev.location]);
export const mono = (size: number): React.CSSProperties => ({ fontFamily: f.mono, fontSize: size, fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" });
export const cond = (): React.CSSProperties => ({ fontFamily: f.condensed, fontWeight: 900, fontStretch: "62%", textTransform: "uppercase", letterSpacing: "-0.005em", width: "100%" });

export const nnum = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** The place's shape, printed as a halftone in the first ink. */
export function Shape({ kind, color, w, h }: { kind: "sun" | "peak" | "pot"; color: string; w: number; h: number }) {
  const dots = { backgroundImage: `radial-gradient(circle at center, ${color} 42%, transparent 44%)`, backgroundSize: "12px 12px" };
  if (kind === "sun") return <div style={{ position: "absolute", width: w * 0.86, height: w * 0.86, right: -w * 0.18, top: -w * 0.08, borderRadius: "50%", ...dots, mixBlendMode: "multiply" }} />;
  if (kind === "pot")
    return <div style={{ position: "absolute", width: w * 0.8, height: w * 0.8, right: -w * 0.16, top: -w * 0.04, borderRadius: "50%", border: `${w * 0.07}px solid ${color}`, mixBlendMode: "multiply" }} />;
  return <div style={{ position: "absolute", width: w * 1.1, height: h, left: -w * 0.05, top: 0, clipPath: "polygon(0 100%, 38% 18%, 52% 42%, 70% 6%, 100% 100%)", ...dots, mixBlendMode: "multiply" }} />;
}

/** Photo printed in one ink: black → ink, white → paper. */
function InkPhoto({ src, color }: { src: string; color: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: color }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "grayscale(1) contrast(1.25) brightness(1.08)", mixBlendMode: "screen" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,.35) 30%, transparent 32%)", backgroundSize: "7px 7px", mixBlendMode: "soft-light" }} />
    </div>
  );
}

export function EventC({ ev, size, photo, qr }: { ev: PosterEvent; size: SizeId; photo?: string | null; qr?: string | null }) {
  const k = inksFor(ev);
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const shape = ev.brands.includes("hotpot") ? "pot" : ev.location === "goa" ? "sun" : "peak";
  const artH = story ? 760 : sq ? 360 : 540;
  return (
    <Box size={size} bg={k.paper} color={k.b}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", gap: sq ? 16 : 22, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono(sq ? 22 : 26), borderBottom: `2px solid ${k.b}`, paddingBottom: 12 }}>
          <span>NomadGao · {placeShort(ev.location).split(",")[0]}</span>
          <span>{ev.typeName}</span>
        </div>

        <div style={{ height: artH, position: "relative", overflow: "hidden", flexShrink: 0 }}>
          {photo ? <InkPhoto src={photo} color={k.b} /> : <Shape kind={shape} color={k.a} w={fr.w - fr.padX * 2} h={artH} />}
          {photo && <div style={{ position: "absolute", width: 230, height: 230, right: 24, top: 24, borderRadius: "50%", background: k.a, mixBlendMode: "multiply", opacity: 0.9 }} />}
          <div style={{ position: "absolute", left: 0, bottom: 0, background: k.a, color: k.b, padding: "10px 18px", ...mono(sq ? 30 : 36), fontWeight: 500, transform: "rotate(-3deg)", transformOrigin: "left bottom", marginBottom: 18, marginLeft: 6 }}>
            {ev.feeShort}
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <FitText max={story ? 230 : sq ? 150 : 190} min={90} maxLines={2} lineHeight={0.86} style={{ ...cond(), color: k.b, textShadow: `5px 4px 0 ${k.a}` }}>
            {ev.title}
          </FitText>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ flex: 1, ...mono(sq ? 26 : 32), lineHeight: 1.4 }}>
            <div>
              {ev.dayShort} {nnum(ev.date)} — {ev.time || "all day"}
            </div>
            <div>{shortVenue(ev)}</div>
            <div style={{ opacity: 0.8 }}>{ev.hasRsvp ? (/WhatsApp/.test(ev.rsvp) ? ev.rsvp : "RSVP: link in bio") : "Walk in · all welcome"}</div>
          </div>
          {qr && ev.hasRsvp && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="" style={{ width: sq ? 120 : 140, height: sq ? 120 : 140, display: "block", mixBlendMode: "multiply" }} />
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${k.b}`, paddingTop: 14 }}>
          <Logos brands={ev.brands} dark={false} height={logoH(size)} gap={14} color={k.b} />
          <span style={mono(22)}>No. {weekNo(ev.date)}</span>
        </div>
      </div>
      <Grain />
    </Box>
  );
}

export function weekNo(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const start = new Date(d.getFullYear(), 0, 1);
  return String(Math.ceil(((+d - +start) / 864e5 + start.getDay() + 1) / 7)).padStart(2, "0");
}

function Lines({ events, k, small }: { events: PosterEvent[]; k: { a: string; b: string }; small?: boolean }) {
  return (
    <div>
      {events.map((e) => (
        <div key={e.id} style={{ padding: `${small ? 12 : 16}px 0`, borderBottom: `2px dashed ${k.b}66` }}>
          <div style={{ display: "flex", gap: 18, alignItems: "baseline" }}>
            <span style={{ ...mono(small ? 24 : 28), background: k.a, padding: "2px 8px", flexShrink: 0 }}>
              {e.dayShort} {nnum(e.date)}
            </span>
            <span style={{ ...cond(), fontSize: small ? 54 : 66, lineHeight: 0.95, width: "auto", flex: 1 }}>{e.title}</span>
          </div>
          <div style={{ ...mono(small ? 22 : 25), marginTop: 6, opacity: 0.85 }}>
            {e.startTime} · {shortVenue(e).split(",")[0]} · {e.feeShort}
          </div>
        </div>
      ))}
    </div>
  );
}

export const CAL_TITLES = [["This", "week"], ["What's", "on"], ["Week", "ahead"]] as const;
export const JOINT_TITLES = ["Beach & mountains", "Two homes, one week", "This week at NomadGao"] as const;

export function CalC({ location, events, range, size, title = 0 }: { location: LocationId; events: PosterEvent[]; range: string; size: SizeId; photo?: string | null; title?: number }) {
  const k = INKS[location];
  const fr = frame(size);
  return (
    <Box size={size} bg={k.paper} color={k.b}>
      <div style={{ position: "absolute", left: 0, right: 0, top: fr.padTop + 52, height: size === "story" ? 620 : size === "square" ? 190 : 420, overflow: "hidden" }}>
        <Shape kind={location === "goa" ? "sun" : "peak"} color={k.a} w={fr.w * (location === "goa" ? 0.62 : 1)} h={size === "story" ? 620 : size === "square" ? 190 : 420} />
      </div>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono(26), borderBottom: `2px solid ${k.b}`, paddingBottom: 12 }}>
          <span>NomadGao · {placeShort(location)}</span>
          <span>{range}</span>
        </div>
        <div style={{ ...cond(), fontSize: size === "square" ? 170 : 220, lineHeight: 0.84, marginTop: 28, textShadow: `6px 5px 0 ${k.a}` }}>
          {CAL_TITLES[title % CAL_TITLES.length][0]}
          <br />
          {CAL_TITLES[title % CAL_TITLES.length][1]}
        </div>
        <FitBlock origin="top left" grow={1.5} style={{ marginTop: 24 }}>
          <div style={{ paddingBottom: 18 }}>
            <Lines events={events} k={k} />
          </div>
        </FitBlock>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, position: "relative", zIndex: 2 }}>
          <Logos brands={events.some((e) => e.brands.includes("hotpot")) ? ["hotpot", "nomadgao"] : ["nomadgao"]} dark={false} height={logoH(size)} gap={14} color={k.b} />
          <span style={mono(22)}>RSVP: link in bio</span>
        </div>
      </div>
      <Grain />
    </Box>
  );
}

export function JointC({ goa, dharamkot, range, size, title = 0 }: { goa: PosterEvent[]; dharamkot: PosterEvent[]; range: string; size: SizeId; title?: number }) {
  const fr = frame(size);
  const paper = "#F2EDE3";
  const sec = (loc: LocationId, evs: PosterEvent[]) => (
    <div style={{ marginTop: 20, color: INKS[loc].b }}>
      <div style={{ ...mono(26), display: "inline-block", background: INKS[loc].b, color: paper, padding: "4px 12px" }}>{placeShort(loc)}</div>
      <Lines small events={evs} k={INKS[loc]} />
    </div>
  );
  return (
    <Box size={size} bg={paper} color="#1E2A33">
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono(26), borderBottom: "2px solid #1E2A33", paddingBottom: 12 }}>
          <span>NomadGao weekly</span>
          <span>{range}</span>
        </div>
        <div style={{ ...cond(), fontSize: size === "square" ? 120 : 150, lineHeight: 0.86, marginTop: 22, color: INKS.goa.b, textShadow: `5px 4px 0 ${INKS.dharamkot.a}` }}>{JOINT_TITLES[title % JOINT_TITLES.length]}</div>
        <FitBlock origin="top left" grow={1.4}>
          <div style={{ paddingBottom: 18 }}>
            {sec("goa", goa)}
            {sec("dharamkot", dharamkot)}
          </div>
        </FitBlock>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, position: "relative", zIndex: 2 }}>
          <Logos brands={[...goa, ...dharamkot].some((e) => e.brands.includes("hotpot")) ? ["hotpot", "nomadgao"] : ["nomadgao"]} dark={false} height={logoH(size)} gap={14} color="#1E2A33" />
          <span style={mono(22)}>RSVP: link in bio</span>
        </div>
      </div>
      <Grain />
    </Box>
  );
}
