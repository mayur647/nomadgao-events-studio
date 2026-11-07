"use client";
/**
 * Direction B — "Faces first". Real photo of people on top, a solid house-colour panel below
 * (faces → +38% likes; solid panel → readable text). Editorial serif headline + clean sans.
 */
import type { LocationId, SizeId } from "@/lib/constants";
import { FitBlock, FitText, Logos, type PosterEvent } from "../common";
import { Box, f, frame, placeShort, shortVenue } from "./kit";

const HOUSE: Record<LocationId | "hotpot", { panel: string; tint: string; text: string; accent: string; paper: string }> = {
  goa: { panel: "#0F4C4F", tint: "#F4D9BE", text: "#FBF4E8", accent: "#F4A259", paper: "#F7F1E7" },
  dharamkot: { panel: "#24382F", tint: "#DCE3DD", text: "#F4F1E8", accent: "#E9A23B", paper: "#F3F1EA" },
  hotpot: { panel: "#A3242A", tint: "#F6E3B4", text: "#FFF8EC", accent: "#F2C14E", paper: "#FBF6EA" },
};
const houseFor = (ev: PosterEvent) => (ev.brands.includes("hotpot") ? HOUSE.hotpot : HOUSE[ev.location]);

const kicker = (size: number, color: string): React.CSSProperties => ({ fontFamily: f.body, fontSize: size, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color });

export function EventB({ ev, size, photo, qr }: { ev: PosterEvent; size: SizeId; photo?: string | null; qr?: string | null }) {
  const h = houseFor(ev);
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const photoH = story ? 1060 : sq ? 520 : 760;
  return (
    <Box size={size} bg={h.panel} color={h.text}>
      <div style={{ height: photoH, position: "relative", background: h.tint, flexShrink: 0, overflow: "hidden" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%", display: "block", filter: "saturate(1.05) contrast(1.03)" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: `0 ${fr.padX}px 30px` }}>
            <div style={{ fontFamily: f.serif, fontStyle: "italic", fontSize: story ? 300 : sq ? 210 : 270, lineHeight: 0.8, color: h.panel, letterSpacing: "-0.03em" }}>{ev.day}</div>
          </div>
        )}
        <div style={{ position: "absolute", left: fr.padX, top: story ? fr.padTop - 120 : fr.padTop - 18 }}>
          <Logos brands={ev.brands} dark={false} height={sq ? 32 : 38} gap={12} color={h.panel} plate="#FFFFFF" />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `${sq ? 34 : 46}px ${fr.padX}px ${story ? fr.padBottom : sq ? 44 : 58}px`, gap: sq ? 12 : 18, minHeight: 0 }}>
        <div style={kicker(sq ? 24 : 28, h.accent)}>
          {ev.typeName} · {placeShort(ev.location).split(",")[0]}
        </div>
        <FitText max={story ? 150 : sq ? 96 : 124} min={60} maxLines={2} lineHeight={0.95} style={{ fontFamily: f.serif, fontWeight: 400, letterSpacing: "-0.01em", width: "100%" }}>
          {ev.title}
        </FitText>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ flex: 1, fontFamily: f.body }}>
            <div style={{ fontSize: sq ? 34 : 42, fontWeight: 600, lineHeight: 1.15 }}>
              {ev.day}, {ev.dayNum} {ev.month} · {ev.startTime}
            </div>
            <div style={{ fontSize: sq ? 26 : 30, fontWeight: 400, lineHeight: 1.35, opacity: 0.85, marginTop: 6 }}>
              {shortVenue(ev)} · {ev.feeShort}
              <br />
              {ev.hasRsvp ? (/WhatsApp/.test(ev.rsvp) ? ev.rsvp : "RSVP via link in bio") : "Walk in, everyone welcome"}
            </div>
          </div>
          {qr && ev.hasRsvp && (
            <div style={{ background: "#fff", padding: 8, borderRadius: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" style={{ width: sq ? 116 : 136, height: sq ? 116 : 136, display: "block" }} />
            </div>
          )}
        </div>
      </div>
    </Box>
  );
}

function Entries({ events, color, accent, small }: { events: PosterEvent[]; color: string; accent: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: small ? 22 : 28 }}>
      {events.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
          <div style={{ width: small ? 78 : 96, flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontFamily: f.serif, fontSize: small ? 64 : 80, lineHeight: 0.85, color: accent }}>{e.dayNum}</div>
            <div style={{ ...kicker(20, color), opacity: 0.7, marginTop: 6 }}>{e.dayShort}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: f.serif, fontSize: small ? 46 : 54, lineHeight: 1 }}>{e.title}</div>
            <div style={{ fontFamily: f.body, fontSize: small ? 24 : 27, marginTop: 6, opacity: 0.8 }}>
              {e.startTime} · {shortVenue(e).split(",")[0]} · {e.feeShort}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalB({ location, events, range, size, photo }: { location: LocationId; events: PosterEvent[]; range: string; size: SizeId; photo?: string | null }) {
  const h = HOUSE[location];
  const fr = frame(size);
  const top = size === "story" ? 620 : size === "square" ? 300 : 400;
  return (
    <Box size={size} bg={h.paper} color={h.panel}>
      <div style={{ height: top, position: "relative", background: h.panel, flexShrink: 0, overflow: "hidden" }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.75 }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 30%, ${h.panel}E6)` }} />
        <div style={{ position: "absolute", left: fr.padX, top: size === "story" ? fr.padTop - 120 : fr.padTop - 18 }}>
          <Logos brands={["nomadgao"]} dark={false} height={36} gap={12} color={h.panel} plate="#FFFFFF" />
        </div>
        <div style={{ position: "absolute", left: fr.padX, right: fr.padX, bottom: 34, color: h.text }}>
          <div style={kicker(26, h.accent)}>This week · {range}</div>
          <div style={{ fontFamily: f.serif, fontSize: size === "square" ? 92 : 112, lineHeight: 0.95, marginTop: 8 }}>
            {location === "goa" ? "In Anjuna" : "In Dharamkot"}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: `40px ${fr.padX}px ${size === "story" ? fr.padBottom : 50}px` }}>
        <FitBlock origin="top left" grow={1.7}>
          <Entries events={events} color={h.panel} accent={h.panel} />
        </FitBlock>
        <div style={{ fontFamily: f.body, fontSize: 26, opacity: 0.75, marginTop: 14 }}>Everyone welcome · RSVP links in bio · @nomad.gao</div>
      </div>
    </Box>
  );
}

export function JointB({ goa, dharamkot, range, size }: { goa: PosterEvent[]; dharamkot: PosterEvent[]; range: string; size: SizeId }) {
  const fr = frame(size);
  const paper = "#F6F2EA";
  const inkc = "#1D2A26";
  const col = (loc: LocationId, evs: PosterEvent[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...kicker(24, HOUSE[loc].panel), borderBottom: `2px solid ${HOUSE[loc].panel}`, paddingBottom: 10, marginBottom: 22 }}>{placeShort(loc)}</div>
      <Entries small events={evs} color={inkc} accent={HOUSE[loc].panel} />
    </div>
  );
  return (
    <Box size={size} bg={paper} color={inkc}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logos brands={["nomadgao"]} dark={false} height={38} gap={12} color={inkc} />
          <span style={kicker(24, inkc)}>{range}</span>
        </div>
        <div style={{ fontFamily: f.serif, fontSize: size === "square" ? 100 : 124, lineHeight: 0.92, margin: "34px 0 38px" }}>
          This week, <span style={{ fontStyle: "italic" }}>together</span>
        </div>
        <FitBlock origin="top left" grow={1.5}>
          <div style={{ display: "flex", gap: 44 }}>
            {col("goa", goa)}
            {col("dharamkot", dharamkot)}
          </div>
        </FitBlock>
        <div style={{ fontFamily: f.body, fontSize: 26, opacity: 0.75, marginTop: 14 }}>Beach or mountains, everyone welcome · RSVP links in bio</div>
      </div>
    </Box>
  );
}
