"use client";
import type { CSSProperties } from "react";
import { eventType } from "@/lib/constants";
import { BODY_FONT, HAND_FONT, type Palette } from "@/lib/themes";
import { hash, pick } from "@/lib/rng";
import { Scene, Sparkle, Squiggle } from "./Art";
import { Badges, FitText, InfoLines, Logos, Pill, QRBox, displayStyle, placeName, type PosterProps } from "./common";

export const EVENT_TEMPLATES = ["arch", "ticket", "polaroid", "bigdate", "fullbleed", "postcard"] as const;
export type EventTemplate = (typeof EVENT_TEMPLATES)[number];
export const TEMPLATE_NAMES: Record<EventTemplate, string> = {
  arch: "Arch window",
  ticket: "Ticket",
  polaroid: "Polaroid",
  bigdate: "Big date",
  fullbleed: "Full photo",
  postcard: "Postcard",
};

const root = (w: number, h: number, pal: Palette, extra?: CSSProperties): CSSProperties => ({
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

const paperPal = (pal: Palette): Palette => ({ ...pal, bg: pal.paper, art: pal.paperInk, ink: pal.paperInk, dark: false });

function Img({ src, style }: { src: string; style?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />;
}

function Header({ ev, pal, logoH = 62, dark }: { ev: PosterProps["ev"]; pal: Palette; logoH?: number; dark?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
      <Logos brands={ev.brands} dark={dark ?? pal.dark} height={logoH} color={pal.ink} />
      <div style={{ fontFamily: HAND_FONT, fontSize: logoH * 0.78, fontWeight: 700, color: pal.ink, whiteSpace: "nowrap" }}>{placeName(ev.location)}</div>
    </div>
  );
}

/* ───────────────────────── 1. Arch window ───────────────────────── */
function Arch({ ev, size, w, h, pal, font, seed, photo, qr }: PosterProps) {
  const story = size === "story", sq = size === "square";
  const aw = story ? 820 : sq ? 400 : 600;
  const archFace = (height: number | string) => (
    <div style={{ width: aw, height, borderRadius: `${aw / 2}px ${aw / 2}px 30px 30px`, overflow: "hidden", background: pal.paper, border: `6px solid ${pal.ink}`, position: "relative", flexShrink: 0 }}>
      {photo ? (
        <Img src={photo} />
      ) : (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <Scene location={ev.location} variant={seed} pal={paperPal(pal)} w={aw} h={aw * 0.62} hotpot={ev.brands.includes("hotpot")} />
          </div>
          <div style={{ position: "absolute", top: "16%", width: "100%", textAlign: "center", fontSize: aw * 0.22 }}>{ev.emoji}</div>
        </>
      )}
    </div>
  );
  const title = (
    <FitText max={story ? 150 : sq ? 92 : 110} min={44} maxLines={3} lineHeight={font.lineHeight} style={{ ...displayStyle(font, pal.ink), textAlign: sq ? "left" : "center", width: "100%" }}>
      {ev.title}
    </FitText>
  );
  const when = (
    <div style={{ fontSize: story ? 46 : 38, fontWeight: 700, textAlign: sq ? "left" : "center" }}>
      {ev.day} {ev.dateShort}
      {ev.time && <span style={{ fontWeight: 400 }}> · {ev.time}</span>}
    </div>
  );
  const sceneH = story ? 300 : 0;
  if (sq) {
    return (
      <div style={root(w, h, pal, { padding: 64 })}>
        <Header ev={ev} pal={pal} logoH={52} />
        <div style={{ flex: 1, display: "flex", gap: 48, marginTop: 40, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
            <Pill bg={pal.accent} fg={pal.onAccent} size={28} style={{ alignSelf: "flex-start" }}>{ev.emoji} {ev.typeName}</Pill>
            {title}
            {when}
            <div style={{ fontSize: 30, opacity: 0.9 }}>📍 {ev.venue}</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <Pill bg={pal.ink} fg={pal.bg} size={32} style={{ alignSelf: "flex-start" }}>{ev.fee}</Pill>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{ev.rsvp}</div>
              </div>
              {qr && <QRBox qr={qr} size={150} />}
            </div>
          </div>
          {archFace("100%")}
        </div>
      </div>
    );
  }
  return (
    <div style={root(w, h, pal, { padding: "64px 72px 0" })}>
      <Header ev={ev} pal={pal} />
      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", marginTop: 44, position: "relative" }}>
        {archFace("100%")}
        <Pill bg={pal.accent} fg={pal.onAccent} size={story ? 34 : 30} style={{ position: "absolute", bottom: -26, left: "50%", transform: "translateX(-50%)", boxShadow: "0 8px 20px rgba(0,0,0,.18)" }}>
          {ev.emoji} {ev.typeName}
        </Pill>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: story ? 22 : 16, marginTop: story ? 60 : 50, marginBottom: story ? 10 : 56 }}>
        {title}
        {when}
        <div style={{ fontSize: story ? 32 : 28, opacity: 0.9, textAlign: "center" }}>📍 {ev.venue}</div>
        {!story && qr ? (
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <QRBox qr={qr} size={112} style={{ padding: 8, borderRadius: 14 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
              <Pill bg={pal.ink} fg={pal.bg} size={28}>{ev.fee}</Pill>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{ev.rsvp}</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <Pill bg={pal.ink} fg={pal.bg} size={story ? 34 : 30}>{ev.fee}</Pill>
              <Badges items={ev.badges.slice(0, story ? 3 : 2)} color={pal.ink} size={story ? 26 : 24} />
            </div>
            {!story && <div style={{ fontSize: 26, fontWeight: 600 }}>{ev.rsvp}</div>}
          </>
        )}
      </div>
      {story && (
        <div style={{ position: "relative", height: sceneH, marginLeft: -72, marginRight: -72 }}>
          <Scene location={ev.location} variant={seed + 1} pal={pal} w={w} h={sceneH} hotpot={ev.brands.includes("hotpot")} />
          {qr ? (
            <QRBox qr={qr} size={170} label={ev.rsvp.replace(" · scan to RSVP", "")} style={{ position: "absolute", right: 64, bottom: 56 }} />
          ) : (
            <Pill bg={pal.paper} fg={pal.paperInk} size={30} style={{ position: "absolute", right: 64, bottom: 64 }}>{ev.rsvp}</Pill>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── 2. Ticket ───────────────────────── */
function Ticket({ ev, size, w, h, pal, font, seed, photo, qr }: PosterProps) {
  const story = size === "story", sq = size === "square";
  const pp = paperPal(pal);
  const sceneH = story ? 420 : sq ? 0 : 230;
  const Field = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: sq ? 22 : 24, opacity: 0.6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: sq ? 30 : story ? 38 : 32, fontWeight: 700, lineHeight: 1.15 }}>{value}</div>
    </div>
  );
  const notch = (side: "left" | "right") => (
    <div style={{ position: "absolute", [side]: -34, top: -34, width: 68, height: 68, borderRadius: "50%", background: pal.bg }} />
  );
  return (
    <div style={root(w, h, pal, { padding: sq ? "56px 56px 0" : "64px 64px 0" })}>
      {sceneH > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <Scene location={ev.location} variant={seed} pal={pal} w={w} h={sceneH} hotpot={ev.brands.includes("hotpot")} />
        </div>
      )}
      <div
        style={{
          position: "relative",
          background: pal.paper,
          color: pal.paperInk,
          borderRadius: 34,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
          marginBottom: sq ? 56 : sceneH - 110,
          flex: 1,
          minHeight: 0,
          transform: `rotate(${sq ? 0 : (seed % 2 ? -1.2 : 1.2)}deg)`,
        }}
      >
        {photo && !sq && (
          <div style={{ height: story ? 520 : 300, borderRadius: "34px 34px 0 0", overflow: "hidden", flexShrink: 0 }}>
            <Img src={photo} />
          </div>
        )}
        <div style={{ padding: sq ? "40px 48px 28px" : "48px 56px 32px", display: "flex", flexDirection: "column", gap: sq ? 18 : 26, flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Logos brands={ev.brands} dark={false} height={sq ? 46 : 54} color={pal.paperInk} />
            <Pill bg={pal.accent} fg={pal.onAccent} size={sq ? 24 : 28}>{ev.emoji} {ev.typeName}</Pill>
          </div>
          <FitText max={story ? 130 : sq ? 84 : 100} min={40} maxLines={story && !photo ? 3 : 2} lineHeight={font.lineHeight} style={{ ...displayStyle(font, pal.paperInk), width: "100%" }}>
            {ev.title}
          </FitText>
          {ev.description && (story || sq || !photo) && (
            <FitText max={sq ? 28 : 34} min={22} maxLines={story ? 3 : 2} lineHeight={1.3} style={{ fontFamily: BODY_FONT, opacity: 0.85, width: "100%" }}>
              {ev.description}
            </FitText>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: sq ? "16px 28px" : "24px 36px", marginTop: "auto" }}>
            <Field label="Date" value={`${ev.day}, ${ev.dateShort}`} />
            <Field label="Time" value={ev.time || "All day"} />
            <Field label="Where" value={ev.venue} />
            <Field label="Hosted by" value={ev.host || ev.brands.map((b) => (b === "hotpot" ? "The Hotpot House" : "NomadGao")).join(" × ")} />
          </div>
        </div>
        <div style={{ position: "relative", borderTop: `4px dashed ${pal.paperInk}55`, margin: "0 0" }}>
          {notch("left")}
          {notch("right")}
        </div>
        <div style={{ padding: sq ? "24px 48px 32px" : "32px 56px 44px", display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...displayStyle(font, pal.accent2), fontSize: sq ? 64 : 84, lineHeight: 1 }}>{ev.feeShort}</div>
            {ev.feeNote && <div style={{ fontSize: 26, fontWeight: 600 }}>{ev.feeNote}</div>}
            <div style={{ fontSize: sq ? 22 : 26, fontWeight: 600 }}>{ev.rsvp}</div>
            <Badges items={ev.badges} color={pp.ink} size={sq ? 20 : 24} />
          </div>
          {qr ? (
            <QRBox qr={qr} size={sq ? 150 : 190} style={{ boxShadow: "none", border: `3px solid ${pal.paperInk}22` }} />
          ) : (
            <div style={{ width: sq ? 150 : 190, height: sq ? 150 : 190, borderRadius: "50%", background: pal.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sq ? 80 : 100 }}>{ev.emoji}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 3. Polaroid ───────────────────────── */
function Polaroid({ ev, size, w, h, pal, font, seed, photo, qr }: PosterProps) {
  const story = size === "story", sq = size === "square";
  const hooks = eventType(ev.typeSlug).hooks;
  const hook = pick(hooks, hash("hook", seed));
  const tilt = seed % 2 ? -3.5 : 3;
  const box = story ? 780 : sq ? 420 : 520;
  const pol = (
    <div style={{ position: "relative", transform: `rotate(${tilt}deg)`, flexShrink: 0 }}>
      <div style={{ background: "#FFFEFA", padding: sq ? "22px 22px 20px" : "30px 30px 28px", boxShadow: "0 26px 50px rgba(0,0,0,.28)", width: box + (sq ? 44 : 60) }}>
        <div style={{ width: box, height: story ? box * 0.95 : box * 0.85, overflow: "hidden", background: pal.bg, position: "relative" }}>
          {photo ? (
            <Img src={photo} />
          ) : (
            <>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
                <Scene location={ev.location} variant={seed} pal={pal} w={box} h={box * 0.6} hotpot={ev.brands.includes("hotpot")} />
              </div>
              <div style={{ position: "absolute", top: "12%", width: "100%", textAlign: "center", fontSize: box * 0.2 }}>{ev.emoji}</div>
            </>
          )}
        </div>
        <FitText max={story ? 64 : sq ? 40 : 50} min={28} maxLines={2} lineHeight={1.05} style={{ fontFamily: HAND_FONT, fontWeight: 700, color: "#2b2b2b", textAlign: "center", width: "100%", marginTop: 14 }}>
          {hook}
        </FitText>
      </div>
      <div style={{ position: "absolute", top: -26, left: "50%", width: 210, height: 58, marginLeft: -105, background: pal.accent, opacity: 0.85, transform: `rotate(${-tilt * 1.6}deg)` }} />
    </div>
  );
  const info = (
    <>
      <Pill bg={pal.accent2} fg={pal.paper} size={story ? 32 : 26} style={{ alignSelf: sq ? "flex-start" : "center" }}>
        {ev.emoji} {ev.typeName}
      </Pill>
      <FitText max={story ? 132 : sq ? 84 : 96} min={40} maxLines={sq ? 3 : 2} lineHeight={font.lineHeight} style={{ ...displayStyle(font, pal.ink), textAlign: sq ? "left" : "center", width: "100%" }}>
        {ev.title}
      </FitText>
      <div style={{ fontSize: story ? 44 : 34, fontWeight: 700, textAlign: sq ? "left" : "center" }}>
        {ev.day} {ev.dateShort}
        {ev.time ? ` · ${ev.time}` : ""}
      </div>
      <div style={{ fontSize: story ? 32 : 27, textAlign: sq ? "left" : "center", opacity: 0.9 }}>📍 {ev.venue}</div>
    </>
  );
  const footer = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: sq ? "flex-start" : "center", gap: 22 }}>
      {qr && <QRBox qr={qr} size={story ? 150 : 112} style={{ padding: 10, borderRadius: 16 }} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: sq || qr ? "flex-start" : "center" }}>
        <Pill bg={pal.ink} fg={pal.bg} size={story ? 32 : 26}>{ev.feeNote ? `${ev.fee} · ${ev.feeNote}` : ev.fee}</Pill>
        <div style={{ fontSize: story ? 28 : 23, fontWeight: 600 }}>{ev.rsvp}</div>
      </div>
    </div>
  );
  if (sq) {
    return (
      <div style={root(w, h, pal, { padding: 60 })}>
        <Header ev={ev} pal={pal} logoH={48} />
        <div style={{ display: "flex", gap: 56, alignItems: "center", flex: 1, minHeight: 0 }}>
          {pol}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            {info}
            {footer}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={root(w, h, pal, { padding: "64px 72px", alignItems: "center" })}>
      {story && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, opacity: 0.16 }}>
          <Scene location={ev.location} variant={seed + 2} pal={pal} w={w} h={360} />
        </div>
      )}
      <div style={{ width: "100%" }}>
        <Header ev={ev} pal={pal} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", margin: story ? "40px 0 30px" : "30px 0 20px" }}>{pol}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: story ? 18 : 12, alignItems: "center", width: "100%", position: "relative" }}>
        {info}
        <div style={{ height: story ? 18 : 6 }} />
        {footer}
      </div>
    </div>
  );
}

/* ───────────────────────── 4. Big date ───────────────────────── */
function BigDate({ ev, size, w, h, pal, font, seed, qr }: PosterProps) {
  const story = size === "story", sq = size === "square";
  const sceneH = story ? 480 : sq ? 180 : 250;
  return (
    <div style={root(w, h, pal, { padding: sq ? "56px 64px 0" : "64px 72px 0" })}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Logos brands={ev.brands} dark={pal.dark} height={sq ? 48 : 58} color={pal.ink} />
        <Pill bg={pal.accent2} fg={pal.paper} size={sq ? 24 : 30}>{ev.emoji} {ev.typeName}</Pill>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: sq ? 8 : 24 }}>
      <div>
        <FitText max={story ? 330 : sq ? 210 : 280} min={90} maxLines={1} lineHeight={0.9} style={{ ...displayStyle(font, pal.accent), width: "100%" }}>
          {ev.day}
        </FitText>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: story ? 18 : 10, flexWrap: "wrap" }}>
          <div style={{ ...displayStyle(font, pal.ink), fontSize: story ? 170 : sq ? 70 : 96, lineHeight: 1 }}>
            {ev.dayNum} {ev.month}
          </div>
          {ev.time && <div style={{ fontSize: story ? 50 : sq ? 34 : 44, fontWeight: 600 }}>{ev.time}</div>}
        </div>
      </div>
      <Squiggle width={story ? 360 : 260} color={pal.accent2} style={{ marginTop: story ? 50 : 24, marginBottom: story ? 40 : 22 }} />
      <FitText max={story ? 150 : sq ? 72 : 110} min={40} maxLines={story ? 3 : 2} lineHeight={font.lineHeight} style={{ ...displayStyle(font, pal.ink), width: "100%" }}>
        {ev.title}
      </FitText>
      {ev.description && !sq && (
        <FitText max={story ? 40 : 34} min={24} maxLines={story ? 3 : 2} lineHeight={1.3} style={{ fontFamily: BODY_FONT, width: "100%", marginTop: 18, opacity: 0.9 }}>
          {ev.description}
        </FitText>
      )}
      <div style={{ display: "flex", gap: 30, alignItems: "flex-end", marginTop: story ? 48 : sq ? 20 : 30 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: story ? 20 : 12 }}>
          <InfoLines ev={ev} color={pal.ink} size={story ? 42 : sq ? 27 : 32} show={story ? ["where", "fee", "host", "bring"] : ["where", "fee"]} />
          <Badges items={ev.badges} color={pal.ink} size={story ? 26 : 22} />
        </div>
        {qr && <QRBox qr={qr} size={story ? 220 : sq ? 120 : 150} label={story ? "Scan to RSVP" : undefined} />}
      </div>
      </div>
      <div style={{ marginLeft: sq ? -64 : -72, marginRight: sq ? -64 : -72, height: sceneH }}>
        <Scene location={ev.location} variant={seed} pal={pal} w={w} h={sceneH} hotpot={ev.brands.includes("hotpot")} />
      </div>
    </div>
  );
}

/* ───────────────────────── 5. Full photo ───────────────────────── */
function FullBleed({ ev, size, w, h, pal, font, seed, photo, qr }: PosterProps) {
  const story = size === "story", sq = size === "square";
  const onPhoto = Boolean(photo);
  const fg = onPhoto ? "#FFFFFF" : pal.ink;
  return (
    <div style={root(w, h, pal, { padding: sq ? 60 : 72, color: fg })}>
      {photo ? (
        <>
          <div style={{ position: "absolute", inset: 0 }}>
            <Img src={photo} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,12,14,.55) 0%, rgba(10,12,14,0) 20%, rgba(10,12,14,0) 36%, rgba(10,12,14,.78) 66%, rgba(10,12,14,.92) 100%)" }} />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: sq ? 120 : story ? 300 : 200, textAlign: "center", fontSize: story ? 300 : 220 }}>{ev.emoji}</div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: story ? 760 : sq ? 420 : 560 }}>
            <Scene location={ev.location} variant={seed} pal={pal} w={w} h={story ? 520 : 400} hotpot={ev.brands.includes("hotpot")} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: story ? 762 : sq ? 422 : 562, background: pal.bg }} />
        </>
      )}
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Logos brands={ev.brands} dark={onPhoto ? true : pal.dark} height={sq ? 50 : 60} color={fg} />
        <div style={{ fontFamily: HAND_FONT, fontSize: sq ? 40 : 50, fontWeight: 700 }}>{placeName(ev.location)}</div>
      </div>
      <div
        style={{
          position: "absolute",
          right: sq ? 60 : 72,
          top: story ? 230 : sq ? 150 : 180,
          width: story ? 250 : 200,
          height: story ? 250 : 200,
          borderRadius: "50%",
          background: pal.accent,
          color: pal.onAccent,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${seed % 2 ? 10 : -8}deg)`,
          boxShadow: "0 12px 30px rgba(0,0,0,.3)",
          textAlign: "center",
          padding: 20,
        }}
      >
        <FitText max={story ? 76 : 60} min={26} maxLines={2} lineHeight={0.95} style={{ ...displayStyle(font, pal.onAccent), width: "100%", textAlign: "center" }}>
          {ev.feeShort}
        </FitText>
        <div style={{ fontSize: story ? 24 : 20, fontWeight: 700, marginTop: 6 }}>{ev.isFree ? "entry" : "per person"}</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: story ? 22 : 14 }}>
        <Pill bg={pal.accent} fg={pal.onAccent} size={story ? 32 : 26} style={{ alignSelf: "flex-start" }}>{ev.emoji} {ev.typeName}</Pill>
        <FitText max={story ? 150 : sq ? 96 : 116} min={44} maxLines={story ? 3 : 2} lineHeight={font.lineHeight} style={{ ...displayStyle(font, fg), width: "100%" }}>
          {ev.title}
        </FitText>
        <div style={{ fontSize: story ? 48 : sq ? 34 : 40, fontWeight: 700 }}>
          {ev.day} {ev.dateShort}
          {ev.time ? <span style={{ fontWeight: 400 }}> · {ev.time}</span> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: story ? 34 : 28 }}>📍 {ev.venue}</div>
            {ev.description && story && <div style={{ fontSize: 32, lineHeight: 1.3, opacity: 0.92 }}>{ev.description}</div>}
            <Badges items={ev.badges} color={fg} size={story ? 26 : 22} />
            <div style={{ fontSize: story ? 28 : 24, fontWeight: 700 }}>{ev.rsvp}</div>
          </div>
          {qr && <QRBox qr={qr} size={story ? 170 : sq ? 120 : 140} />}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 6. Postcard ───────────────────────── */
function Postcard({ ev, size, w, h, pal, font, seed, photo, qr }: PosterProps) {
  const story = size === "story", sq = size === "square";
  const pi = pal.paperInk;
  const locName = ev.location === "goa" ? "Goa" : "Dharamkot";
  const picture = (
    <div style={{ position: "relative", overflow: "hidden", background: pal.bg, borderRadius: 10, ...(sq ? { width: "46%", height: "100%" } : { height: story ? 820 : 520, flexShrink: 0 }) }}>
      {photo ? (
        <Img src={photo} />
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <Scene location={ev.location} variant={seed} pal={pal} w={sq ? 460 : 880} h={sq ? 520 : story ? 600 : 440} hotpot={ev.brands.includes("hotpot")} />
        </div>
      )}
      <div style={{ position: "absolute", left: 36, top: 30, right: 36, color: photo ? "#fff" : pal.ink, textShadow: photo ? "0 2px 16px rgba(0,0,0,.55)" : "none" }}>
        <div style={{ fontFamily: HAND_FONT, fontSize: sq ? 44 : 58, fontWeight: 700, lineHeight: 1 }}>Greetings from</div>
        <div style={{ ...displayStyle(font, photo ? "#fff" : pal.ink), fontSize: sq ? 84 : story ? 150 : 120, lineHeight: 0.95 }}>{locName}</div>
      </div>
    </div>
  );
  const lines: string[] = [`${ev.day}, ${ev.dateShort}`, ev.time || "", ev.venue, ev.feeNote ? `${ev.fee} · ${ev.feeNote}` : ev.fee].filter(Boolean);
  const message = (
    <div style={{ flex: 1, display: "flex", gap: sq ? 26 : 36, minHeight: 0, padding: sq ? "8px 0 0 30px" : "36px 6px 6px" }}>
      <div style={{ flex: 1.15, display: "flex", flexDirection: "column", gap: sq ? 10 : 16, minWidth: 0 }}>
        <div style={{ fontFamily: HAND_FONT, fontSize: sq ? 38 : 48, color: pi, fontWeight: 700 }}>Dear friend,</div>
        <FitText max={story ? 96 : sq ? 58 : 70} min={34} maxLines={3} lineHeight={font.lineHeight} style={{ ...displayStyle(font, pi), width: "100%" }}>
          {`${ev.emoji} ${ev.title}`}
        </FitText>
        {ev.description && (
          <FitText max={story ? 46 : sq ? 32 : 38} min={24} maxLines={story ? 5 : 3} lineHeight={1.08} style={{ fontFamily: HAND_FONT, color: pi, width: "100%" }}>
            {ev.description}
          </FitText>
        )}
        <div style={{ marginTop: "auto", fontFamily: HAND_FONT, fontSize: sq ? 36 : 44, color: pal.accent2, fontWeight: 700 }}>
          — {ev.host ? ev.host : "the NomadGao crew"} ✕
        </div>
      </div>
      <div style={{ width: 3, background: `${pi}33`, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: sq ? 10 : 16, minWidth: 0, position: "relative" }}>
        <div style={{ alignSelf: "flex-end", position: "relative", marginBottom: sq ? 4 : 18 }}>
          <div style={{ width: sq ? 130 : 170, height: sq ? 156 : 200, background: pal.accent, outline: `6px dotted ${pal.paper}`, outlineOffset: -6, border: `4px solid ${pal.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: pal.onAccent, transform: "rotate(3deg)" }}>
            <div style={{ fontSize: sq ? 60 : 80 }}>{ev.emoji}</div>
            <div style={{ fontSize: sq ? 22 : 28, fontWeight: 800 }}>{ev.feeShort}</div>
          </div>
          <div style={{ position: "absolute", left: sq ? -80 : -100, top: sq ? 50 : 70, width: sq ? 130 : 160, height: sq ? 130 : 160, borderRadius: "50%", border: `4px solid ${pi}99`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: `${pi}cc`, fontWeight: 800, fontSize: sq ? 20 : 24, lineHeight: 1.1, transform: "rotate(-14deg)" }}>
            {ev.dayShort.toUpperCase()}
            <br />
            {ev.dateShort.toUpperCase()}
            <br />
            {locName.toUpperCase()}
          </div>
        </div>
        {lines.map((l) => (
          <div key={l} style={{ borderBottom: `2.5px solid ${pi}55`, paddingBottom: 6, fontSize: sq ? 25 : story ? 34 : 29, fontWeight: 600, color: pi, lineHeight: 1.15 }}>{l}</div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "auto" }}>
          {qr && <QRBox qr={qr} size={sq ? 100 : story ? 150 : 120} style={{ boxShadow: "none", padding: 6, borderRadius: 10 }} />}
          <div style={{ fontSize: sq ? 20 : 24, fontWeight: 700, color: pi }}>{ev.rsvp}</div>
        </div>
      </div>
    </div>
  );
  return (
    <div
      style={root(w, h, pal, {
        padding: sq ? 48 : 64,
        backgroundImage: `radial-gradient(${pal.ink}22 2.5px, transparent 2.5px)`,
        backgroundSize: "34px 34px",
        backgroundColor: pal.bg,
      })}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sq ? 24 : 40 }}>
        <Logos brands={ev.brands} dark={pal.dark} height={sq ? 46 : 58} color={pal.ink} />
        <Sparkle size={sq ? 46 : 60} color={pal.accent} />
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: pal.paper,
          borderRadius: 16,
          padding: sq ? 24 : 30,
          display: "flex",
          flexDirection: sq ? "row" : "column",
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
          transform: `rotate(${seed % 2 ? -1.4 : 1.2}deg)`,
          marginBottom: sq ? 12 : 20,
        }}
      >
        {picture}
        {message}
      </div>
      {story && <Badges items={ev.badges} color={pal.ink} size={28} />}
    </div>
  );
}

export function EventPoster({ template, ...p }: PosterProps & { template: EventTemplate }) {
  switch (template) {
    case "arch":
      return <Arch {...p} />;
    case "ticket":
      return <Ticket {...p} />;
    case "polaroid":
      return <Polaroid {...p} />;
    case "bigdate":
      return <BigDate {...p} />;
    case "fullbleed":
      return <FullBleed {...p} />;
    case "postcard":
      return <Postcard {...p} />;
  }
}
