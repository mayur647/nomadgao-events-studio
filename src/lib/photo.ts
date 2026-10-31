"use client";
/**
 * Brightness of a photo's top and bottom bands (0 = black, 1 = white), measured once when the
 * photo is loaded. Posters use it to decide how strong the shade behind text needs to be.
 */
export interface PhotoStats {
  top: number;
  bottom: number;
  mid: number;
}

const cache = new Map<string, PhotoStats>();

export function photoStats(src: string | null | undefined): PhotoStats | null {
  return src ? cache.get(src) ?? null : null;
}

export async function measurePhoto(src: string): Promise<PhotoStats | null> {
  if (cache.has(src)) return cache.get(src)!;
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const W = 48, H = 64;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    // same crop as object-fit: cover at a portrait-ish frame
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const band = (y0: number, y1: number) => {
      let sum = 0, n = 0;
      for (let y = Math.floor(y0 * H); y < Math.floor(y1 * H); y++)
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          // perceived luminance
          sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
          n++;
        }
      return n ? sum / n : 0.5;
    };
    const s = { top: band(0, 0.25), mid: band(0.35, 0.65), bottom: band(0.55, 1) };
    cache.set(src, s);
    return s;
  } catch {
    return null;
  }
}

/** Relative luminance of a hex colour. */
export function lum(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
