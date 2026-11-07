"use client";
/**
 * Direction A — "Programme". Type-led, like a venue programme (Barbican / Paradiso / Somerset House).
 * One grotesk, three sizes, left-aligned. Colour = event family within the location's palette.
 */
import type { LocationId, SizeId } from "@/lib/constants";
import { FitBlock, FitText, Logos, type PosterEvent } from "../common";
import { Box, f, familyOf, frame, ink, placeShort, shortVenue, type Family } from "./kit";

const PAL: Record<LocationId | "hotpot", Record<Family, string> & { paper: string; ink: string; band: string }> = {
  goa: { social: "#E4572E", food: "#F2C14E", outdoors: "#0F5257", learn: "#F3C1C6", wellbeing: "#C9D99A", paper: "#F6F0E4", ink: "#1A1F2B", band: "#0F5257" },
  dharamkot: { social: "#7A2824", food: "#E9A23B", outdoors: "#1F3B33", learn: "#2B57A5", wellbeing: "#DCE6E8", paper: "#F3F1EA", ink: "#17212B", band: "#1F3B33" },
  hotpot: { social: "#B8262A", food: "#B8262A", outdoors: "#B8262A", learn: "#F2C14E", wellbeing: "#F2C14E", paper: "#FBF7EC", ink: "#1C1917", band: "#B8262A" },
};
const palFor = (ev: PosterEvent) => (ev.brands.includes("hotpot") ? PAL.hotpot : PAL[ev.location]);

const S = { head: 0, desc: 58, info: 32 }; // the three sizes (headline fits itself)
const label = (size: number): React.CSSProperties => ({ fontFamily: f.grotesk, fontSize: size, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" });
const headline = (stretch = 75): React.CSSProperties => ({ fontFamily: f.grotesk, fontWeight: 800, fontStretch: `${stretch}%`, letterSpacing: "-0.025em", width: "100%" });

export function EventA({ ev, size, photo, qr }: { ev: PosterEvent; size: SizeId; photo?: string | null; qr?: string | null }) {
  const p = palFor(ev);
  const bg = p[familyOf(ev.typeSlug)];
  const fg = ink(bg, p.ink, p.paper);
  const fr = frame(size);
  const sq = size === "square";
  const desc = sq ? 50 : S.desc;
  const info = sq ? 28 : S.info;
  return (
    <Box size={size} bg={bg} color={fg}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", gap: sq ? 22 : 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", ...label(info), borderBottom: `3px solid ${fg}`, paddingBottom: 14 }}>
          <span>{ev.typeName}</span>
          <span>{placeShort(ev.location)}</span>
        </div>

        <FitText max={size === "story" ? 210 : sq ? 150 : 180} min={80} maxLines={3} lineHeight={0.88} style={headline()}>
          {ev.title}
        </FitText>

        <div style={{ fontFamily: f.grotesk, fontSize: desc, lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {ev.day} {ev.dayNum} {ev.month}
          <br />
          <span style={{ fontWeight: 400 }}>{ev.time}</span>
        </div>

        {photo ? (
          <div style={{ flex: 1, minHeight: 0, borderRadius: 6, overflow: "hidden", background: fg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -12, bottom: -0.16 * (size === "story" ? 900 : sq ? 420 : 600), fontFamily: f.grotesk, fontWeight: 800, fontStretch: "75%", fontSize: size === "story" ? 900 : sq ? 420 : 600, lineHeight: 1, letterSpacing: "-0.04em", color: fg, opacity: 0.14 }}>
              {ev.dayNum}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
          <div style={{ flex: 1, fontFamily: f.grotesk, fontSize: info, lineHeight: 1.3, fontWeight: 500 }}>
            <div>{shortVenue(ev)}</div>
            <div>
              {ev.fee}
              {ev.feeNote ? ` · ${ev.feeNote}` : ""}
            </div>
            <div style={{ opacity: 0.8 }}>{ev.hasRsvp ? (/WhatsApp/.test(ev.rsvp) ? ev.rsvp : "Scan or tap the link in bio to RSVP") : "Walk in · everyone welcome"}</div>
          </div>
          {qr && ev.hasRsvp && (
            <div style={{ background: p.paper, padding: 10, borderRadius: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" style={{ width: sq ? 130 : 150, height: sq ? 130 : 150, display: "block" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${fg}`, paddingTop: 18 }}>
          <Logos brands={ev.brands} dark={fg !== p.ink} height={sq ? 34 : 40} gap={14} color={fg} />
          <span style={{ ...label(info - 4), letterSpacing: "0.04em", textTransform: "none", fontWeight: 500 }}>{ev.brands.includes("nomadgao") ? "@nomad.gao" : "@thehotpothouse"}</span>
        </div>
      </div>
    </Box>
  );
}

function Rows({ events, color, accent, compact }: { events: PosterEvent[]; color: string; accent: (e: PosterEvent) => string; compact?: boolean }) {
  return (
    <div>
      {events.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 26, alignItems: "flex-start", padding: `${compact ? 16 : 22}px 0`, borderTop: `2px solid ${color}33` }}>
          <div style={{ width: compact ? 92 : 110, flexShrink: 0, fontFamily: f.grotesk }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "0.08em" }}>{e.dayShort.toUpperCase()}</div>
            <div style={{ fontSize: compact ? 52 : 60, fontWeight: 800, lineHeight: 0.95, fontStretch: "75%" }}>{e.dayNum}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: f.grotesk, fontSize: compact ? 46 : 54, fontWeight: 800, fontStretch: "75%", lineHeight: 1, letterSpacing: "-0.015em" }}>{e.title}</div>
            <div style={{ fontFamily: f.grotesk, fontSize: 28, marginTop: 8, opacity: 0.85 }}>
              {e.time || "All day"} · {shortVenue(e).split(",")[0]} · {e.feeShort}
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: 26, background: accent(e), marginTop: 14, flexShrink: 0, boxShadow: `0 0 0 2px ${color}22` }} />
        </div>
      ))}
    </div>
  );
}

export function CalA({ location, events, range, size }: { location: LocationId; events: PosterEvent[]; range: string; size: SizeId; photo?: string | null }) {
  const p = PAL[location];
  const fr = frame(size);
  return (
    <Box size={size} bg={p.paper} color={p.ink}>
      <div style={{ background: p.band, color: p.paper, padding: `${fr.padTop}px ${fr.padX}px 40px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...label(30), borderBottom: `3px solid ${p.paper}`, paddingBottom: 14 }}>
          <span>This week</span>
          <span>{range}</span>
        </div>
        <div style={{ ...headline(), fontSize: size === "square" ? 130 : 168, lineHeight: 0.9, marginTop: 26 }}>{location === "goa" ? "Anjuna" : "Dharamkot"}</div>
      </div>
      <div style={{ padding: `10px ${fr.padX}px ${fr.padBottom}px`, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <FitBlock origin="top left" grow={1.7}>
          <Rows events={events} color={p.ink} accent={(e) => (e.brands.includes("hotpot") ? PAL.hotpot.social : p[familyOf(e.typeSlug)])} />
        </FitBlock>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${p.ink}`, paddingTop: 18 }}>
          <Logos brands={["nomadgao"]} dark={false} height={40} gap={14} color={p.ink} />
          <span style={{ fontFamily: f.grotesk, fontSize: 28, fontWeight: 500 }}>RSVP links in bio</span>
        </div>
      </div>
    </Box>
  );
}

export function JointA({ goa, dharamkot, range, size }: { goa: PosterEvent[]; dharamkot: PosterEvent[]; range: string; size: SizeId }) {
  const fr = frame(size);
  const paper = "#F5F1E8";
  const inkc = "#18202A";
  const sec = (loc: LocationId, evs: PosterEvent[]) => (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: PAL[loc].band, color: paper, padding: "10px 18px", borderRadius: 4, ...label(28) }}>
        {placeShort(loc)}
      </div>
      <Rows compact events={evs} color={inkc} accent={(e) => (e.brands.includes("hotpot") ? PAL.hotpot.social : PAL[loc][familyOf(e.typeSlug)])} />
    </div>
  );
  return (
    <Box size={size} bg={paper} color={inkc}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...label(30), borderBottom: `3px solid ${inkc}`, paddingBottom: 14 }}>
          <span>This week at NomadGao</span>
          <span>{range}</span>
        </div>
        <FitBlock origin="top left" grow={1.5}>
          {sec("goa", goa)}
          {sec("dharamkot", dharamkot)}
        </FitBlock>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${inkc}`, paddingTop: 18 }}>
          <Logos brands={["nomadgao"]} dark={false} height={40} gap={14} color={inkc} />
          <span style={{ fontFamily: f.grotesk, fontSize: 28, fontWeight: 500 }}>Two homes, one community</span>
        </div>
      </div>
    </Box>
  );
}
