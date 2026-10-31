"use client";
import { useEffect, useState } from "react";
import type { Palette } from "@/lib/themes";

/*
 * Illustration system — flat, layered silhouettes.
 * One light source, one ground, depth from tone: far → near gets darker (or lighter on dark palettes).
 * Every object stands on something. No outlines except tiny details, no floating objects.
 * Scenes are drawn in a 1080 × 600 box with the focal point near the centre, so they crop well
 * into wide strips (bottom-anchored) and into square / portrait frames.
 */

type P = [number, number];
const f = (n: number) => Math.round(n * 10) / 10;

/* ───────────────────────── colour helpers ───────────────────────── */
function hex(c: string): [number, number, number] {
  const h = c.replace("#", "");
  const v = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
export function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b);
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("");
}
/** Tonal steps from the background towards the ink colour. */
function tones(pal: Palette) {
  const t = (k: number) => mix(pal.bg, pal.art, k);
  return { far: t(0.16), mid: t(0.3), forest: t(0.5), near: t(0.72), dark: t(0.9) };
}

/* deterministic jitter */
const jit = (i: number, s = 1) => (Math.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1;

/* ───────────────────────── shared pieces ───────────────────────── */
function Pine({ x, y, h, fill }: { x: number; y: number; h: number; fill: string }) {
  // a deodar: narrow, layered, slightly drooping tiers
  const tiers = 5;
  let d = "";
  for (let i = 0; i < tiers; i++) {
    const top = y - h + (i * h * 0.78) / tiers;
    const bot = top + h * 0.3;
    const half = h * (0.1 + i * 0.045);
    d += `M${f(x)} ${f(top)} L${f(x + half)} ${f(bot)} Q${f(x)} ${f(bot - h * 0.05)} ${f(x - half)} ${f(bot)} Z `;
  }
  d += `M${f(x - h * 0.025)} ${f(y - h * 0.12)} H${f(x + h * 0.025)} V${f(y)} H${f(x - h * 0.025)} Z`;
  return <path d={d} fill={fill} />;
}

function Birds({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={color} fill="none" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 0 q9 -9 18 0 q9 -9 18 0" />
      <path d="M46 -22 q7 -7 14 0 q7 -7 14 0" />
    </g>
  );
}

const FLAG_COLORS = ["#2C58A6", "#F7F4EC", "#C8372D", "#3F8A4E", "#F2C14E"];
function PrayerFlags({ a, b, sag, n, line }: { a: P; b: P; sag: number; n: number; line: string }) {
  const c: P = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + sag];
  const q = (t: number): P => [
    (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
    (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
  ];
  return (
    <g>
      <path d={`M${a[0]} ${a[1]} Q${f(c[0])} ${f(c[1])} ${b[0]} ${b[1]}`} stroke={line} strokeWidth={2.5} fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.6) / (n + 0.2);
        const p = q(t);
        const p2 = q(Math.min(1, t + 0.01));
        const ang = f((Math.atan2(p2[1] - p[1], p2[0] - p[0]) * 180) / Math.PI);
        return (
          <g key={i} transform={`translate(${f(p[0])} ${f(p[1])}) rotate(${ang})`}>
            <path d="M-11 0 H11 V28 L0 24 L-11 28 Z" fill={FLAG_COLORS[i % 5]} />
          </g>
        );
      })}
    </g>
  );
}

/* ───────────────────────── DHARAMKOT ───────────────────────── */
const PEAKS: P[] = [[0, 330], [80, 285], [150, 300], [240, 225], [330, 285], [420, 240], [520, 175], [610, 255], [700, 215], [780, 255], [880, 190], [980, 260], [1080, 235]];

function Range({ pts, fill, snow }: { pts: P[]; fill: string; snow: string }) {
  const body = `M0 600 L${pts.map((p) => p.join(" ")).join(" L")} L1080 600 Z`;
  const caps: string[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const [lx, ly] = pts[i - 1], [rx, ry] = pts[i + 1];
    if (!(ly > py && ry > py) || py > 260) continue;
    const k = 0.34;
    const L: P = [px + (lx - px) * k, py + (ly - py) * k];
    const R: P = [px + (rx - px) * k, py + (ry - py) * k];
    const base = Math.max(L[1], R[1]);
    const mx = (t: number) => L[0] + (R[0] - L[0]) * t;
    caps.push(`M${f(L[0])} ${f(L[1])} L${px} ${py} L${f(R[0])} ${f(R[1])} L${f(mx(0.78))} ${f(base - 8)} L${f(mx(0.62))} ${f(base + 6)} L${f(mx(0.45))} ${f(base - 6)} L${f(mx(0.28))} ${f(base + 8)} Z`);
  }
  return (
    <g>
      <path d={body} fill={fill} />
      {caps.map((d, i) => (
        <path key={i} d={d} fill={snow} />
      ))}
    </g>
  );
}

function Stupa({ x, y, s, body, trim, gold }: { x: number; y: number; s: number; body: string; trim: string; gold: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-62 0 H62 V-14 H-62 Z" fill={trim} />
      <path d="M-50 -14 H50 V-28 H-50 Z" fill={body} />
      <path d="M-42 -28 A42 42 0 0 1 42 -28 Z" fill={body} />
      <path d="M-13 -70 H13 V-56 H-13 Z" fill={trim} />
      <path d="M-9 -70 L-3 -128 H3 L9 -70 Z" fill={gold} />
      <path d="M-9 -84 H9 M-7 -98 H7 M-5 -112 H5" stroke={trim} strokeWidth={2.5} />
      <circle cx={0} cy={-136} r={6} fill={gold} />
    </g>
  );
}

function Monk({ x, y, s, robe, shawl, skin }: { x: number; y: number; s: number; robe: string; shawl: string; skin: string }) {
  // seen walking away, simple and respectful: shaved head, robe, shawl over one shoulder
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-15 -52 C-22 -36 -25 -14 -26 0 H24 C23 -14 21 -36 14 -52 Q0 -58 -15 -52 Z" fill={robe} />
      <path d="M-15 -52 Q0 -58 14 -52 C17 -44 19 -36 20 -26 C8 -32 -4 -40 -15 -52 Z" fill={shawl} />
      <circle cx={0} cy={-64} r={10} fill={skin} />
    </g>
  );
}

export function HimalayaScene({ variant, pal, w = 1080, h = 440 }: { variant: number; pal: Palette; w?: number | string; h?: number | string }) {
  const t = tones(pal);
  const v = Math.abs(variant) % 3;
  const snow = pal.dark ? mix(pal.ink, "#ffffff", 0.3) : "#FFFFFF";
  const forestPines: { x: number; h: number }[] = [];
  for (let i = 0; i < 46; i++) {
    const x = i * 24 + jit(i) * 10;
    const ridgeY = 448 + Math.sin(i / 4) * 10;
    forestPines.push({ x, h: 46 + Math.abs(jit(i, 3)) * 46 + (ridgeY - 448) });
  }
  return (
    <svg viewBox="0 0 1080 600" width={w} height={h} preserveAspectRatio="xMidYMax slice" style={{ display: "block" }}>
      {v === 2 ? (
        <path d="M818 120 A44 44 0 1 0 862 178 A36 36 0 1 1 818 120 Z" fill={pal.accent} />
      ) : (
        <circle cx={v === 0 ? 800 : 300} cy={150} r={46} fill={pal.accent} />
      )}
      <Range pts={PEAKS} fill={t.far} snow={snow} />
      <path d="M0 400 C120 352 230 384 320 364 S500 322 590 352 S780 394 880 352 S1010 334 1080 362 V600 H0 Z" fill={t.mid} />
      <path d="M0 455 C200 436 380 466 540 450 S900 430 1080 456 V600 H0 Z" fill={t.forest} />
      {forestPines.map((p, i) => (
        <Pine key={i} x={p.x} y={460 + Math.sin(i / 4) * 8} h={p.h} fill={t.forest} />
      ))}
      {v === 1 && <Stupa x={540} y={516} s={1} body={snow} trim={t.dark} gold={pal.accent} />}
      <path d="M0 520 C240 502 470 534 680 514 S960 498 1080 518 V600 H0 Z" fill={t.near} />
      {/* foreground deodars, anchored on the near ground */}
      <Pine x={70} y={540} h={250} fill={t.dark} />
      <Pine x={150} y={548} h={170} fill={t.dark} />
      <Pine x={1000} y={536} h={270} fill={t.dark} />
      <Pine x={925} y={544} h={180} fill={t.dark} />
      {/* prayer flags tied between a deodar and a pole, never across the sky */}
      {v !== 2 && (
        <>
          <path d="M378 520 V320" stroke={t.dark} strokeWidth={6} strokeLinecap="round" />
          <PrayerFlags a={[78, 330]} b={[378, 322]} sag={60} n={10} line={t.dark} />
          <PrayerFlags a={[378, 322]} b={[700, 360]} sag={50} n={10} line={t.dark} />
          <path d="M700 516 V360" stroke={t.dark} strokeWidth={6} strokeLinecap="round" />
        </>
      )}
      {v === 2 && (
        <>
          <PrayerFlags a={[1000, 300]} b={[640, 380]} sag={55} n={12} line={t.dark} />
          <path d="M640 516 V380" stroke={t.dark} strokeWidth={6} strokeLinecap="round" />
          <Birds x={420} y={140} color={t.forest} />
        </>
      )}
      {v === 1 && <Monk x={470} y={526} s={1.1} robe={pal.accent2} shawl={mix(pal.accent2, "#000000", 0.25)} skin={t.dark} />}
      {v === 0 && <Monk x={560} y={528} s={1.1} robe={pal.accent2} shawl={mix(pal.accent2, "#000000", 0.25)} skin={t.dark} />}
      <path d="M0 572 C300 560 700 584 1080 566 V600 H0 Z" fill={t.dark} />
    </svg>
  );
}

/* ───────────────────────── GOA ───────────────────────── */
function Palm({ x, len, lean, fill }: { x: number; len: number; lean: number; fill: string }) {
  // trunk: tapered curve from the sand to the crown
  const base: P = [x, 600];
  const crown: P = [x + lean * len * 0.42, 600 - len];
  const c1: P = [x, 600 - len * 0.45];
  const c2: P = [crown[0] - lean * len * 0.08, crown[1] + len * 0.28];
  const pt = (s: number): P => {
    const u = 1 - s;
    return [
      u * u * u * base[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * crown[0],
      u * u * u * base[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * crown[1],
    ];
  };
  const left: P[] = [], right: P[] = [];
  for (let i = 0; i <= 16; i++) {
    const s = i / 16;
    const p = pt(s), q = pt(Math.min(1, s + 0.02));
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const wdt = (len * 0.034) * (1 - s * 0.45);
    left.push([p[0] + nx * wdt, p[1] + ny * wdt]);
    right.push([p[0] - nx * wdt, p[1] - ny * wdt]);
  }
  const trunk = `M${left.map((p) => `${f(p[0])} ${f(p[1])}`).join(" L")} L${right.reverse().map((p) => `${f(p[0])} ${f(p[1])}`).join(" L")} Z`;
  const k = len / 380;
  const fronds: [P, P][] = [
    [[-175, 60], [-90, -40]],
    [[-150, -30], [-70, -80]],
    [[-70, -105], [-25, -80]],
    [[45, -110], [20, -85]],
    [[150, -40], [75, -85]],
    [[180, 55], [95, -35]],
    [[95, 120], [80, 20]],
    [[-105, 120], [-80, 20]],
  ];
  const fd = fronds.map(([tip, ctl]) => {
    const T: P = [crown[0] + tip[0] * k, crown[1] + tip[1] * k];
    const C: P = [crown[0] + ctl[0] * k, crown[1] + ctl[1] * k];
    const dx = T[0] - crown[0], dy = T[1] - crown[1];
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const side = ny < 0 ? -1 : 1; // thickness hangs below the spine
    const th = 26 * k;
    const C2: P = [C[0] + nx * th * side * -1, C[1] + ny * th * side * -1 + th];
    return `M${f(crown[0])} ${f(crown[1])} Q${f(C[0])} ${f(C[1])} ${f(T[0])} ${f(T[1])} Q${f(C2[0])} ${f(C2[1])} ${f(crown[0])} ${f(crown[1] + 6 * k)} Z`;
  });
  return (
    <g fill={fill}>
      <path d={trunk} />
      {fd.map((d, i) => (
        <path key={i} d={d} />
      ))}
      <circle cx={f(crown[0] - 9 * k)} cy={f(crown[1] + 14 * k)} r={f(10 * k)} />
      <circle cx={f(crown[0] + 10 * k)} cy={f(crown[1] + 16 * k)} r={f(10 * k)} />
    </g>
  );
}

function Boat({ x, y, hull, sail }: { x: number; y: number; hull: string; sail: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-4 -4 V-96" stroke={hull} strokeWidth={4} />
      <path d="M0 -92 L52 -16 H0 Z" fill={sail} />
      <path d="M-86 -8 Q0 24 86 -8 Q40 0 0 0 Q-40 0 -86 -8 Z" fill={hull} />
    </g>
  );
}

export function GoaScene({ variant, pal, w = 1080, h = 440 }: { variant: number; pal: Palette; w?: number | string; h?: number | string }) {
  const t = tones(pal);
  const v = Math.abs(variant) % 3;
  const horizon = 400;
  const sea = mix(pal.bg, pal.accent2, pal.dark ? 0.45 : 0.4);
  const seaLine = mix(sea, pal.bg, 0.5);
  const sand = mix(pal.bg, pal.accent, 0.22);
  const sunX = v === 1 ? 300 : 540;
  const sunR = v === 1 ? 120 : 150;
  return (
    <svg viewBox="0 0 1080 600" width={w} height={h} preserveAspectRatio="xMidYMax slice" style={{ display: "block" }}>
      {v === 2 ? (
        <circle cx={790} cy={170} r={58} fill={pal.accent} />
      ) : (
        <g>
          <path d={`M${sunX - sunR} ${horizon} A${sunR} ${sunR} 0 0 1 ${sunX + sunR} ${horizon} Z`} fill={pal.accent} />
          {[18, 40, 60].map((d, i) => (
            <rect key={i} x={sunX - sunR} y={horizon - d} width={sunR * 2} height={6 + i * 2} fill={pal.bg} />
          ))}
        </g>
      )}
      <rect x={0} y={horizon} width={1080} height={200} fill={sea} />
      {/* sun glitter on water */}
      {v !== 2 &&
        [0, 1, 2, 3].map((i) => (
          <rect key={i} x={sunX - (sunR * 0.8 - i * 26)} y={horizon + 14 + i * 16} width={(sunR * 0.8 - i * 26) * 2} height={5} rx={2.5} fill={pal.accent} opacity={0.75} />
        ))}
      {[430, 462].map((y, i) => {
        let d = `M${-40 + i * 30} ${y}`;
        for (let k = 0; k < 24; k++) d += " q12 -8 24 0 q12 8 24 0";
        return <path key={y} d={d} stroke={seaLine} strokeWidth={3} fill="none" opacity={0.8} />;
      })}
      {v === 1 && <Boat x={760} y={452} hull={t.dark} sail={pal.paper} />}
      {v === 2 && <Birds x={360} y={170} color={t.near} />}
      {v === 0 && <Birds x={720} y={200} color={t.near} s={0.9} />}
      <path d="M0 492 C260 474 620 508 1080 484 V600 H0 Z" fill={sand} />
      {/* palms grouped at the edges, rooted in the sand */}
      {v === 0 && (
        <>
          <Palm x={110} len={328} lean={0.7} fill={t.dark} />
          <Palm x={210} len={245} lean={0.45} fill={t.near} />
          <Palm x={990} len={295} lean={-0.6} fill={t.dark} />
        </>
      )}
      {v === 1 && (
        <>
          <Palm x={930} len={344} lean={-0.75} fill={t.dark} />
          <Palm x={1010} len={270} lean={-0.35} fill={t.near} />
          <Palm x={70} len={229} lean={0.5} fill={t.near} />
        </>
      )}
      {v === 2 && (
        <>
          <Palm x={120} len={311} lean={0.55} fill={t.dark} />
          <Palm x={880} len={344} lean={-0.5} fill={t.dark} />
          <Palm x={980} len={254} lean={-0.2} fill={t.near} />
        </>
      )}
      <path d="M0 568 C300 556 700 580 1080 562 V600 H0 Z" fill={t.near} />
    </svg>
  );
}

/* ───────────────────────── Hotpot line art (recoloured PNG) ───────────────────────── */
const tintCache = new Map<string, string>();
export function useTinted(src: string, color: string) {
  const key = `${src}|${color}`;
  const [url, setUrl] = useState<string | null>(tintCache.get(key) ?? null);
  useEffect(() => {
    if (tintCache.has(key)) {
      setUrl(tintCache.get(key)!);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
      const out = c.toDataURL("image/png");
      tintCache.set(key, out);
      if (alive) setUrl(out);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [key, src, color]);
  return url;
}

export function HotpotArt({ color, width, style }: { color: string; width: number; style?: React.CSSProperties }) {
  const url = useTinted("/art/line-hotpot-red.png", color);
  if (!url) return <div style={{ width, height: width * 0.6875, ...style }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={width} height={width * 0.6875} style={{ display: "block", ...style }} />;
}

/** The scene strip for a location (or the hotpot table when Hotpot House is on the poster). */
export function Scene({
  location,
  variant,
  pal,
  w = 1080,
  h = 440,
  hotpot = false,
}: {
  location: "goa" | "dharamkot";
  variant: number;
  pal: Palette;
  w?: number | string;
  h?: number | string;
  hotpot?: boolean;
}) {
  void hotpot;
  return location === "goa" ? <GoaScene variant={variant} pal={pal} w={w} h={h} /> : <HimalayaScene variant={variant} pal={pal} w={w} h={h} />;
}

/* ───────────────────────── Small ornaments ───────────────────────── */
export function Sparkle({ size = 40, color, style }: { size?: number; color: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" style={style}>
      <path d="M0 -18 C2 -4 4 -2 18 0 C4 2 2 4 0 18 C-2 4 -4 2 -18 0 C-4 -2 -2 -4 0 -18 Z" fill={color} />
    </svg>
  );
}

export function Squiggle({ width = 260, color, style }: { width?: number; color: string; style?: React.CSSProperties }) {
  let d = "M4 14";
  const n = Math.floor((width - 8) / 28);
  for (let i = 0; i < n; i++) d += " q7 -12 14 0 q7 12 14 0";
  return (
    <svg width={width} height={28} viewBox={`0 0 ${width} 28`} style={style}>
      <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
    </svg>
  );
}
