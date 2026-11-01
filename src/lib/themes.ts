import type { BrandId, LocationId } from "./constants";
import { hash, pick, shuffled } from "./rng";
import { palettes, hotpotPalettes, fontSets, bodyFont, handFont, type Palette, type FontSet } from "@/brand/brand";

// Colours and fonts live in src/brand/brand.ts. This file only decides how posters pick from them.
export type { Palette, FontSet };
export const PALETTES: Record<LocationId, Palette[]> = palettes;
export const HOTPOT_PALETTES = hotpotPalettes;
export const FONT_SETS = fontSets;
export const BODY_FONT = bodyFont;
export const HAND_FONT = handFont;

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
