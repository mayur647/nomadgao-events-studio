"use client";
/**
 * Shared rules for the 2026 poster directions (research: one type system, ≤3 type sizes,
 * fixed frame + variable colour, event families, Story safe zones, 3:4 grid-crop safety).
 */
import type { CSSProperties, ReactNode } from "react";
import type { BrandId, LocationId, SizeId } from "@/lib/constants";
import { lum } from "@/lib/photo";
import type { PosterEvent } from "../common";

export type Family = "social" | "food" | "outdoors" | "learn" | "wellbeing";

const FAMILY_OF: Record<string, Family> = {
  "game-night": "social", karaoke: "social", party: "social", meetup: "social", "watch-party": "social", music: "social", movie: "social",
  "hotpot-social": "food", potluck: "food", "food-walk": "food",
  hike: "outdoors", bonfire: "outdoors",
  workshop: "learn", talk: "learn", "sip-paint": "learn",
  wellness: "wellbeing",
};
export const familyOf = (slug: string): Family => FAMILY_OF[slug] ?? "social";

export const f = {
  grotesk: "var(--f-grotesk)",
  serif: "var(--f-serif)",
  condensed: "var(--f-condensed)",
  mono: "var(--f-mono)",
  body: "var(--f-body)",
};

export const ink = (bg: string, dark = "#16191F", light = "#FBF7EF") => (lum(bg) > 0.42 ? dark : light);

/** Size-aware frame. Story keeps the top ~250px and bottom ~300px for Instagram's UI. */
export function frame(size: SizeId) {
  if (size === "story") return { w: 1080, h: 1920, padX: 80, padTop: 240, padBottom: 300 };
  if (size === "square") return { w: 1080, h: 1080, padX: 68, padTop: 60, padBottom: 60 };
  // post: 4:5, but the profile grid crops to 3:4, so keep ~40px extra side margin for anything important
  return { w: 1080, h: 1350, padX: 76, padTop: 68, padBottom: 68 };
}

export function Box({ size, bg, color, children, style }: { size: SizeId; bg: string; color: string; children: ReactNode; style?: CSSProperties }) {
  const fr = frame(size);
  return (
    <div style={{ width: fr.w, height: fr.h, background: bg, color, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: f.body, ...style }}>
      {children}
    </div>
  );
}

/** Film-grain / paper texture as an SVG data URI (renders inside html-to-image). */
export const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`;

export function Grain({ opacity = 0.22 }: { opacity?: number }) {
  return <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, backgroundSize: "300px 300px", opacity, mixBlendMode: "multiply", pointerEvents: "none" }} />;
}

export function hasBrand(ev: { brands: BrandId[] }, b: BrandId) {
  return ev.brands.includes(b);
}

export const placeShort = (loc: LocationId) => (loc === "goa" ? "Anjuna, Goa" : "Dharamkot, Himachal");

/** "7:30 – 11 PM" → "19:30–23:00" style for the printed direction. */
export function time24(t: string) {
  return t;
}

export function shortVenue(ev: PosterEvent) {
  return ev.venue.replace(/^NomadGao /, "").replace(/^Meet at /, "Meet at ");
}

export function rsvpShort(ev: PosterEvent) {
  if (!ev.hasRsvp) return "Walk in";
  if (/whatsapp/i.test(ev.rsvp)) return ev.rsvp.replace("RSVP on WhatsApp", "RSVP · WhatsApp");
  return "RSVP · link in bio";
}
