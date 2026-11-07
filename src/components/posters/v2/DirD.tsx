"use client";
/**
 * The mix: Printed matter's paper, two inks, grain and type — with three layouts the shuffle rotates through.
 * Photos print in full colour here (faces first), unlike the one-ink flyer.
 *  - Postcard: photo front with "Greetings from…", postcard back with stamp, postmark and address lines.
 *  - Polaroid: a taped polaroid of your guests, date-stamped, headline below.
 *  - Cover:    faces-first — the photo fills the top, an ink panel below carries the headline.
 */
import type { SizeId } from "@/lib/constants";
import { FitText, Logos, type PosterEvent } from "../common";
import { Box, f, frame, Grain, placeShort, shortVenue } from "./kit";
import { Shape, cond, inksFor, mono, nnum, weekNo } from "./DirC";

export const MIX_LAYOUTS = ["postcard", "polaroid", "cover"] as const;
export type MixLayout = (typeof MIX_LAYOUTS)[number];
export const MIX_NAMES: Record<MixLayout, string> = { postcard: "Postcard", polaroid: "Polaroid", cover: "Cover" };

type P = { ev: PosterEvent; size: SizeId; photo?: string | null; qr?: string | null };

const place = (ev: PosterEvent) => (ev.location === "goa" ? "Anjuna" : "Dharamkot");
const shapeOf = (ev: PosterEvent) => (ev.brands.includes("hotpot") ? "pot" : ev.location === "goa" ? "sun" : "peak") as "sun" | "peak" | "pot";
const rsvpLine = (ev: PosterEvent) => (ev.hasRsvp ? (/WhatsApp/.test(ev.rsvp) ? ev.rsvp : "RSVP: link in bio") : "Walk in · all welcome");

function Photo({ src, pos = "center 35%" }: { src: string; pos?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, display: "block", filter: "saturate(0.95) contrast(1.04)" }} />;
}

function TopBar({ ev, color, size }: { ev: PosterEvent; color: string; size: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", ...mono(size), borderBottom: `2px solid ${color}`, paddingBottom: 12, flexShrink: 0 }}>
      <span>
        {ev.brands.includes("nomadgao") ? "NomadGao" : "The Hotpot House"} · {placeShort(ev.location).split(",")[0]}
      </span>
      <span>{ev.typeName}</span>
    </div>
  );
}

function Foot({ ev, color, sq }: { ev: PosterEvent; color: string; sq: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${color}`, paddingTop: 14, flexShrink: 0 }}>
      <Logos brands={ev.brands} dark={false} height={sq ? 30 : 36} gap={12} color={color} />
      <span style={mono(22)}>No. {weekNo(ev.date)}</span>
    </div>
  );
}

/* ───────────── Postcard ───────────── */
export function PostcardD({ ev, size, photo, qr }: P) {
  const k = inksFor(ev);
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const frontH = story ? 640 : sq ? 360 : 500;
  return (
    <Box size={size} bg={k.paper} color={k.b}>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", gap: sq ? 16 : 24 }}>
        <TopBar ev={ev} color={k.b} size={sq ? 22 : 26} />
        {/* the front */}
        <div style={{ height: frontH, position: "relative", overflow: "hidden", flexShrink: 0, background: "#FFFEFA", padding: 14, boxShadow: `0 0 0 2px ${k.b}` }}>
          <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: k.paper }}>
            {photo ? <Photo src={photo} /> : <Shape kind={shapeOf(ev)} color={k.a} w={fr.w - fr.padX * 2 - 28} h={frontH - 28} />}
            <div style={{ position: "absolute", left: 0, bottom: 0, background: k.b, color: k.paper, padding: sq ? "12px 18px" : "16px 24px" }}>
              <div style={{ ...mono(sq ? 18 : 22), opacity: 0.9 }}>Greetings from</div>
              <div style={{ ...cond(), width: "auto", fontSize: sq ? 64 : story ? 96 : 84, lineHeight: 0.9, color: k.paper, textShadow: `4px 3px 0 ${k.a}` }}>{place(ev)}</div>
            </div>
          </div>
        </div>
        {/* the back */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: sq ? 22 : 30 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: sq ? 10 : 14 }}>
            <FitText max={story ? 170 : sq ? 104 : 132} min={64} maxLines={2} lineHeight={0.88} style={{ ...cond(), color: k.b, textShadow: `4px 3px 0 ${k.a}` }}>
              {ev.title}
            </FitText>
            <div style={{ display: "flex", flexDirection: "column", ...mono(sq ? 23 : 28), marginTop: "auto" }}>
              {[`${ev.dayShort} ${nnum(ev.date)} — ${ev.time || "all day"}`, shortVenue(ev), `${ev.feeShort} · ${rsvpLine(ev)}`].map((l) => (
                <div key={l} style={{ borderBottom: `2px dashed ${k.b}77`, padding: sq ? "6px 0" : "9px 0" }}>
                  {l}
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: sq ? 190 : 230, flexShrink: 0, borderLeft: `2px dashed ${k.b}77`, paddingLeft: sq ? 20 : 28, display: "flex", flexDirection: "column", alignItems: "center", gap: sq ? 14 : 20 }}>
            {/* stamp */}
            <div style={{ width: "100%", aspectRatio: "4 / 5", background: k.a, padding: 8, boxShadow: `0 0 0 3px ${k.paper}, 0 0 0 5px ${k.b}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(2deg)" }}>
              {qr && ev.hasRsvp ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="" style={{ width: "100%", display: "block", mixBlendMode: "multiply" }} />
              ) : (
                <span style={{ ...cond(), width: "auto", fontSize: sq ? 56 : 68, color: k.b, textAlign: "center", lineHeight: 0.9 }}>{ev.feeShort}</span>
              )}
            </div>
            {/* postmark */}
            <div style={{ width: sq ? 140 : 168, height: sq ? 140 : 168, borderRadius: "50%", border: `3px solid ${k.b}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-12deg)", opacity: 0.85, ...mono(sq ? 18 : 22), textAlign: "center", lineHeight: 1.15 }}>
              <span>{ev.dayShort}</span>
              <span style={{ fontSize: sq ? 30 : 36 }}>{nnum(ev.date)}</span>
              <span>{place(ev)}</span>
            </div>
          </div>
        </div>
        <Foot ev={ev} color={k.b} sq={sq} />
      </div>
      <Grain opacity={0.18} />
    </Box>
  );
}

/* ───────────── Polaroid ───────────── */
export function PolaroidD({ ev, size, photo, qr }: P) {
  const k = inksFor(ev);
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const pw = story ? 820 : sq ? 470 : 700; // polaroid width
  const ph = story ? 760 : sq ? 400 : 560; // picture height
  return (
    <Box size={size} bg={k.paper} color={k.b}>
      <div style={{ position: "absolute", left: 0, right: 0, top: fr.padTop + 56, height: story ? 900 : sq ? 560 : 720, overflow: "hidden", opacity: 0.5 }}>
        <Shape kind={shapeOf(ev)} color={k.a} w={fr.w} h={story ? 900 : sq ? 560 : 720} />
      </div>
      <div style={{ padding: `${fr.padTop}px ${fr.padX}px ${fr.padBottom}px`, display: "flex", flexDirection: "column", height: "100%", gap: sq ? 14 : 22, position: "relative" }}>
        <TopBar ev={ev} color={k.b} size={sq ? 22 : 26} />
        <div style={{ display: "flex", justifyContent: sq ? "flex-start" : "center", flex: 1, minHeight: 0, maxHeight: ph + (sq ? 80 : 114), gap: 30, alignItems: "stretch", paddingTop: 10 }}>
          <div style={{ width: pw, background: "#FFFEFA", padding: `${sq ? 16 : 22}px ${sq ? 16 : 22}px 0`, boxShadow: "0 18px 40px rgba(30,30,30,.22)", transform: "rotate(-2.5deg)", position: "relative", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: -22, left: "50%", width: 200, height: 52, marginLeft: -100, background: k.a, opacity: 0.85, transform: "rotate(3deg)" }} />
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", background: k.paper, position: "relative" }}>
              {photo ? <Photo src={photo} /> : <Shape kind={shapeOf(ev)} color={k.b} w={pw - 44} h={ph} />}
            </div>
            <div style={{ height: sq ? 64 : 92, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", ...mono(sq ? 20 : 26), color: "#3A3A3A" }}>
              <span>
                {ev.dayShort} {nnum(ev.date)}
              </span>
              <span>{ev.startTime}</span>
            </div>
          </div>
          {sq && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", ...mono(22) }}>
              {qr && ev.hasRsvp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="" style={{ width: 130, height: 130, display: "block", mixBlendMode: "multiply" }} />
              )}
            </div>
          )}
        </div>
        <FitText max={story ? 200 : sq ? 96 : 140} min={64} maxLines={2} lineHeight={0.86} style={{ ...cond(), color: k.b, textShadow: `5px 4px 0 ${k.a}`, marginTop: sq ? 4 : 14, flexShrink: 0 }}>
          {ev.title}
        </FitText>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ flex: 1, ...mono(sq ? 23 : 30), lineHeight: 1.4 }}>
            <div>{ev.time || "All day"}</div>
            <div>{shortVenue(ev)}</div>
            <div>
              {ev.feeShort} · {rsvpLine(ev)}
            </div>
          </div>
          {!sq && qr && ev.hasRsvp && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="" style={{ width: 140, height: 140, display: "block", mixBlendMode: "multiply" }} />
          )}
        </div>
        <Foot ev={ev} color={k.b} sq={sq} />
      </div>
      <Grain opacity={0.16} />
    </Box>
  );
}

/* ───────────── Cover (faces first) ───────────── */
export function CoverD({ ev, size, photo, qr }: P) {
  const k = inksFor(ev);
  const fr = frame(size);
  const sq = size === "square";
  const story = size === "story";
  const photoH = story ? 1060 : sq ? 500 : 740;
  return (
    <Box size={size} bg={k.b} color={k.paper}>
      <div style={{ height: photoH, position: "relative", overflow: "hidden", flexShrink: 0, background: k.paper }}>
        {photo ? (
          <Photo src={photo} />
        ) : (
          <>
            <Shape kind={shapeOf(ev)} color={k.a} w={fr.w} h={photoH} />
            <div style={{ position: "absolute", left: fr.padX, right: fr.padX, bottom: 26 }}>
              <FitText max={story ? 300 : sq ? 200 : 260} min={120} maxLines={1} lineHeight={0.8} style={{ ...cond(), color: k.b }}>
                {ev.day}
              </FitText>
            </div>
          </>
        )}
        <div style={{ position: "absolute", left: fr.padX, right: fr.padX, top: story ? fr.padTop - 120 : fr.padTop - 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logos brands={ev.brands} dark={false} height={sq ? 30 : 36} gap={12} color={k.b} plate={k.paper} />
          <span style={{ ...mono(sq ? 20 : 24), background: k.a, color: k.b, padding: "6px 12px", transform: "rotate(2deg)" }}>{ev.feeShort}</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: `${sq ? 26 : 38}px ${fr.padX}px ${story ? fr.padBottom : sq ? 40 : 54}px`, gap: sq ? 10 : 16, minHeight: 0, position: "relative" }}>
        <div style={{ ...mono(sq ? 20 : 26), color: k.a }}>
          {ev.typeName} · {place(ev)} · No. {weekNo(ev.date)}
        </div>
        <FitText max={story ? 190 : sq ? 104 : 140} min={64} maxLines={2} lineHeight={0.86} style={{ ...cond(), color: k.paper, textShadow: `5px 4px 0 ${k.a}88` }}>
          {ev.title}
        </FitText>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ flex: 1, ...mono(sq ? 22 : 28), lineHeight: 1.4 }}>
            <div>
              {ev.dayShort} {nnum(ev.date)} — {ev.time || "all day"}
            </div>
            <div>{shortVenue(ev)}</div>
            <div style={{ opacity: 0.85 }}>{rsvpLine(ev)}</div>
          </div>
          {qr && ev.hasRsvp && (
            <div style={{ background: k.paper, padding: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" style={{ width: sq ? 112 : 132, height: sq ? 112 : 132, display: "block" }} />
            </div>
          )}
        </div>
      </div>
      <Grain opacity={0.2} />
    </Box>
  );
}

export function MixPoster({ layout, ...p }: P & { layout: MixLayout }) {
  if (layout === "postcard") return <PostcardD {...p} />;
  if (layout === "polaroid") return <PolaroidD {...p} />;
  return <CoverD {...p} />;
}
