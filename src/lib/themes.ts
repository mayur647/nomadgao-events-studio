import type { BrandId, LocationId } from "./constants";
import { hash, pick, shuffled } from "./rng";

/**
 * Poster palettes. One system, two places:
 *  - Goa: sunsets, sea, palm green and the pinks/yellows of old Goan houses.
 *  - Dharamkot: deodar pine, snowline, saffron + maroon robes, prayer-flag blue.
 * When The Hotpot House is on the poster, its chili red / hat yellow join the pool.
 */
export interface Palette {
  name: string;
  bg: string; // page background
  paper: string; // cards, tickets, polaroids
  ink: string; // main text on bg
  paperInk: string; // text on paper
  accent: string; // stickers, chips
  onAccent: string;
  accent2: string; // second accent
  art: string; // line art stroke on bg
  dark: boolean; // is bg dark (logo choice)
}

export const PALETTES: Record<LocationId, Palette[]> = {
  goa: [
    { name: "Sundowner", bg: "#F6DFC0", paper: "#FFF8EC", ink: "#1E2A3A", paperInk: "#1E2A3A", accent: "#E8582E", onAccent: "#FFF8EC", accent2: "#11807F", art: "#1E2A3A", dark: false },
    { name: "Arabian Sea", bg: "#0E5A5E", paper: "#FFF4E2", ink: "#FFF4E2", paperInk: "#0E3B3E", accent: "#FFB23F", onAccent: "#0E3B3E", accent2: "#F2785C", art: "#FFF4E2", dark: true },
    { name: "Casa Pink", bg: "#F4C4C0", paper: "#FFF7F2", ink: "#3A1630", paperInk: "#3A1630", accent: "#1C6E8C", onAccent: "#FFF7F2", accent2: "#F2B632", art: "#3A1630", dark: false },
    { name: "Coconut Night", bg: "#15263A", paper: "#FDF0DA", ink: "#FDF0DA", paperInk: "#15263A", accent: "#F4B942", onAccent: "#15263A", accent2: "#EE6A3C", art: "#F4B942", dark: true },
    { name: "Palm Lime", bg: "#DCE6B5", paper: "#FBFBF1", ink: "#22401E", paperInk: "#22401E", accent: "#E5552F", onAccent: "#FBFBF1", accent2: "#2B7A78", art: "#22401E", dark: false },
    { name: "Feni Yellow", bg: "#F5C94C", paper: "#FFFBEF", ink: "#2A1F14", paperInk: "#2A1F14", accent: "#1F5F8B", onAccent: "#FFFBEF", accent2: "#D9482B", art: "#2A1F14", dark: false },
  ],
  dharamkot: [
    { name: "Deodar", bg: "#1E3A31", paper: "#F3F1E6", ink: "#EEF2E8", paperInk: "#1E3A31", accent: "#E8A13A", onAccent: "#1E3A31", accent2: "#9A3430", art: "#EEF2E8", dark: true },
    { name: "Snowline", bg: "#E6EEF1", paper: "#FFFFFF", ink: "#1B2B3A", paperInk: "#1B2B3A", accent: "#8E2E2B", onAccent: "#FFFFFF", accent2: "#2F6C8F", art: "#1B2B3A", dark: false },
    { name: "Prayer Flag", bg: "#F3E9D6", paper: "#FFFCF5", ink: "#22313F", paperInk: "#22313F", accent: "#2C58A6", onAccent: "#FFFCF5", accent2: "#C8372D", art: "#22313F", dark: false },
    { name: "Monastery", bg: "#7A2824", paper: "#FBEFD9", ink: "#FBEFD9", paperInk: "#5A1C19", accent: "#F0A93B", onAccent: "#4A1512", accent2: "#F7D9A5", art: "#FBEFD9", dark: true },
    { name: "Dusk Peaks", bg: "#2A3456", paper: "#F4EDE1", ink: "#F4EDE1", paperInk: "#2A3456", accent: "#F2C14E", onAccent: "#2A3456", accent2: "#E77B5A", art: "#F4EDE1", dark: true },
    { name: "Moss & Saffron", bg: "#C9D4B0", paper: "#FAF8EF", ink: "#2A3A22", paperInk: "#2A3A22", accent: "#D9822B", onAccent: "#FAF8EF", accent2: "#7E2B27", art: "#2A3A22", dark: false },
  ],
};

export const HOTPOT_PALETTES: Palette[] = [
  { name: "Hotpot Chili", bg: "#B8262A", paper: "#FBF7EC", ink: "#FBF7EC", paperInk: "#1C1917", accent: "#F2C14E", onAccent: "#1C1917", accent2: "#FBF7EC", art: "#F2C14E", dark: true },
  { name: "Hotpot Broth", bg: "#FBEFC9", paper: "#FFFDF6", ink: "#1C1917", paperInk: "#1C1917", accent: "#B8262A", onAccent: "#FBF7EC", accent2: "#3F7D4E", art: "#B8262A", dark: false },
];

export interface FontSet {
  name: string;
  display: string; // css var
  displayWeight: number;
  displayCase: "none" | "uppercase";
  tracking: string;
  lineHeight: number;
}

export const FONT_SETS: FontSet[] = [
  { name: "Bricolage", display: "var(--f-bricolage)", displayWeight: 800, displayCase: "none", tracking: "-0.035em", lineHeight: 0.92 },
  { name: "Fraunces", display: "var(--f-fraunces)", displayWeight: 800, displayCase: "none", tracking: "-0.025em", lineHeight: 0.95 },
  { name: "Unbounded", display: "var(--f-unbounded)", displayWeight: 700, displayCase: "none", tracking: "-0.03em", lineHeight: 1.0 },
  { name: "Caprasimo", display: "var(--f-caprasimo)", displayWeight: 400, displayCase: "none", tracking: "-0.01em", lineHeight: 0.98 },
  { name: "Anton", display: "var(--f-anton)", displayWeight: 400, displayCase: "uppercase", tracking: "0.005em", lineHeight: 0.95 },
];

export const BODY_FONT = "var(--f-outfit)";
export const HAND_FONT = "var(--f-caveat)";

export function palettePool(location: LocationId, brands: BrandId[]) {
  const base = PALETTES[location];
  if (brands.includes("hotpot")) return [...base, ...HOTPOT_PALETTES, ...HOTPOT_PALETTES];
  return base;
}

/** Look for a poster: palette + font, decided by a seed. */
export function lookFor(location: LocationId, brands: BrandId[], seed: number) {
  const pool = palettePool(location, brands);
  return {
    palette: pick(shuffled(pool, hash("pal", seed)), hash("p", seed)),
    font: pick(FONT_SETS, hash("font", seed)),
  };
}
