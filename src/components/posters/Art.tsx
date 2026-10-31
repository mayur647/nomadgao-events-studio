"use client";
import { useEffect, useState } from "react";
import type { Palette } from "@/lib/themes";

/* ───────────────────────── geometry helpers ───────────────────────── */
type P = [number, number];
const f = (n: number) => Math.round(n * 10) / 10;
const fp = (p: P): P => [f(p[0]), f(p[1])];
const qb = (a: P, c: P, b: P, t: number): P => fp([
  (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
]);
const cb = (a: P, c1: P, c2: P, b: P, t: number): P => {
  const u = 1 - t;
  return fp([
    u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
    u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
  ]);
};

/* ───────────────────────── Goa pieces ───────────────────────── */
function Palm({ x, y, s = 1, flip = false, stroke }: { x: number; y: number; s?: number; flip?: boolean; stroke: string }) {
  const a: P = [0, 0], c1: P = [6, -90], c2: P = [22, -175], b: P = [62, -250];
  const a2: P = [20, 0], c3: P = [26, -90], c4: P = [40, -172], b2: P = [74, -246];
  const rings = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84].map((t) => [cb(a, c1, c2, b, t), cb(a2, c3, c4, b2, t)] as [P, P]);
  const crown: P = [68, -250];
  const fronds: [P, P][] = [
    [[-150, 40], [-70, -70]],
    [[-120, -60], [-50, -105]],
    [[-35, -125], [-10, -110]],
    [[70, -95], [30, -120]],
    [[150, 30], [80, -70]],
    [[105, 95], [90, 0]],
    [[-95, 100], [-75, 0]],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M0 0 C6 -90 22 -175 62 -250`} strokeWidth={4} />
      <path d={`M20 0 C26 -90 40 -172 74 -246`} strokeWidth={4} />
      {rings.map(([p, q], i) => (
        <path key={i} d={`M${p[0]} ${p[1]} Q${(p[0] + q[0]) / 2} ${(p[1] + q[1]) / 2 + 6} ${q[0]} ${q[1]}`} strokeWidth={3} />
      ))}
      {fronds.map(([end, ctrl], i) => {
        const e: P = [crown[0] + end[0], crown[1] + end[1]];
        const c: P = [crown[0] + ctrl[0], crown[1] + ctrl[1]];
        const leaves = [0.25, 0.37, 0.49, 0.61, 0.73, 0.85].map((t) => {
          const p = qb(crown, c, e, t);
          const p2 = qb(crown, c, e, Math.min(1, t + 0.06));
          const dx = p2[0] - p[0], dy = p2[1] - p[1];
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const L = 30 * (1 - t * 0.5);
          const dir = ny > 0 ? 1 : -1;
          return `M${p[0]} ${p[1]} l${f(nx * L * dir + dx * 0.6)} ${f(ny * L * dir + dy * 0.6)} M${p[0]} ${p[1]} l${f(-nx * L * dir * 0.6 + dx * 0.5)} ${f(-ny * L * dir * 0.6 + dy * 0.5)}`;
        });
        return (
          <g key={i}>
            <path d={`M${crown[0]} ${crown[1]} Q${c[0]} ${c[1]} ${e[0]} ${e[1]}`} strokeWidth={4} />
            <path d={leaves.join(" ")} strokeWidth={2.5} />
          </g>
        );
      })}
      <circle cx={60} cy={-236} r={9} strokeWidth={3} />
      <circle cx={78} cy={-234} r={9} strokeWidth={3} />
      <circle cx={70} cy={-222} r={9} strokeWidth={3} />
    </g>
  );
}

function Waves({ y, rows = 3, gap = 28, amp = 12, stroke, width = 1080 }: { y: number; rows?: number; gap?: number; amp?: number; stroke: string; width?: number }) {
  const ds = Array.from({ length: rows }, (_, r) => {
    const yy = y + r * gap;
    const off = r % 2 ? -30 : 0;
    let d = `M${-60 + off} ${yy}`;
    for (let i = 0; i < Math.ceil(width / 60) + 3; i++) d += ` q15 ${-amp} 30 0 q15 ${amp} 30 0`;
    return d;
  });
  return (
    <g stroke={stroke} fill="none" strokeWidth={3.5} strokeLinecap="round">
      {ds.map((d, i) => (
        <path key={i} d={d} opacity={1 - i * 0.18} />
      ))}
    </g>
  );
}

function Sun({ cx, cy, r, stroke, fill }: { cx: number; cy: number; r: number; stroke: string; fill: string }) {
  const stripes = [0.18, 0.36, 0.54, 0.72].map((k) => {
    const d = r * k;
    const half = Math.sqrt(r * r - d * d);
    return `M${f(cx - half)} ${f(cy - d)} H${f(cx + half)}`;
  });
  const rays = Array.from({ length: 9 }, (_, i) => {
    const ang = Math.PI + (i * Math.PI) / 8;
    const r1 = r + 22, r2 = r + 52;
    return `M${f(cx + Math.cos(ang) * r1)} ${f(cy + Math.sin(ang) * r1)} L${f(cx + Math.cos(ang) * r2)} ${f(cy + Math.sin(ang) * r2)}`;
  });
  return (
    <g strokeLinecap="round">
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={fill} stroke={stroke} strokeWidth={4} />
      <path d={stripes.join(" ")} stroke={stroke} strokeWidth={3} />
      <path d={rays.join(" ")} stroke={stroke} strokeWidth={4} />
    </g>
  );
}

function Birds({ x, y, stroke, s = 1 }: { x: number; y: number; stroke: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={stroke} fill="none" strokeWidth={3} strokeLinecap="round">
      <path d="M0 0 q10 -12 20 0 q10 -12 20 0" />
      <path d="M52 -26 q8 -9 16 0 q8 -9 16 0" />
      <path d="M30 -48 q6 -7 12 0 q6 -7 12 0" />
    </g>
  );
}

function Boat({ x, y, stroke, fill }: { x: number; y: number; stroke: string; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={stroke} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-90 -6 Q0 30 90 -6 Q40 2 0 2 Q-40 2 -90 -6 Z" fill={fill} />
      <path d="M-6 -2 V-110" fill="none" />
      <path d="M-4 -106 L54 -26 H-4 Z" fill={fill} />
      <path d="M-60 6 q10 6 20 0 M30 8 q10 6 20 0" fill="none" />
    </g>
  );
}

export function GoaScene({ variant, pal, w = 1080, h = 440 }: { variant: number; pal: Palette; w?: number; h?: number }) {
  const s = pal.art;
  const v = variant % 3;
  return (
    <svg viewBox="0 0 1080 440" width={w} height={h} preserveAspectRatio="xMidYMax slice" style={{ display: "block" }}>
      {v === 0 && (
        <>
          <Sun cx={540} cy={330} r={120} stroke={s} fill={pal.accent} />
          <path d="M0 330 H1080" stroke={s} strokeWidth={4} />
          <Waves y={364} rows={3} stroke={s} />
          <Palm x={120} y={440} s={1.15} stroke={s} />
          <Palm x={960} y={440} s={0.95} flip stroke={s} />
          <Birds x={640} y={150} stroke={s} />
        </>
      )}
      {v === 1 && (
        <>
          <Sun cx={830} cy={300} r={90} stroke={s} fill={pal.accent} />
          <path d="M0 300 H1080" stroke={s} strokeWidth={4} />
          <Waves y={332} rows={4} gap={26} stroke={s} />
          <Boat x={560} y={300} stroke={s} fill={pal.accent2} />
          <Palm x={90} y={440} s={1.25} stroke={s} />
          <Palm x={250} y={440} s={0.85} stroke={s} />
          <Birds x={380} y={130} stroke={s} s={0.9} />
        </>
      )}
      {v === 2 && (
        <>
          <Sun cx={300} cy={320} r={100} stroke={s} fill={pal.accent} />
          <path d="M0 320 H1080" stroke={s} strokeWidth={4} />
          <Waves y={352} rows={3} stroke={s} />
          <Palm x={700} y={440} s={1.05} flip stroke={s} />
          <Palm x={880} y={440} s={1.3} stroke={s} />
          <Palm x={60} y={440} s={0.8} flip stroke={s} />
          <Birds x={470} y={170} stroke={s} />
        </>
      )}
    </svg>
  );
}

/* ───────────────────────── Himalaya pieces ───────────────────────── */
function Range({ pts, stroke, snow, fill }: { pts: P[]; stroke: string; snow: string; fill: string }) {
  const line = `M${pts.map((p) => p.join(" ")).join(" L")}`;
  const caps: string[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    if (p[1] > 190) continue;
    if (!(pts[i - 1][1] > p[1] && pts[i + 1][1] > p[1])) continue;
    const L: P = fp([p[0] + (pts[i - 1][0] - p[0]) * 0.32, p[1] + (pts[i - 1][1] - p[1]) * 0.32]);
    const R: P = fp([p[0] + (pts[i + 1][0] - p[0]) * 0.32, p[1] + (pts[i + 1][1] - p[1]) * 0.32]);
    const mid = (L[1] + R[1]) / 2;
    const xs = (k: number) => f(L[0] + (R[0] - L[0]) * k);
    caps.push(`M${L[0]} ${L[1]} L${p[0]} ${p[1]} L${R[0]} ${R[1]} L${xs(0.78)} ${f(mid - 6)} L${xs(0.6)} ${f(mid + 10)} L${xs(0.42)} ${f(mid - 4)} L${xs(0.22)} ${f(mid + 12)} Z`);
  }
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <path d={`${line} L1080 440 L0 440 Z`} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={stroke} strokeWidth={4} />
      {caps.map((d, i) => (
        <path key={i} d={d} fill={snow} stroke={stroke} strokeWidth={3} />
      ))}
    </g>
  );
}

function Pine({ x, y, h, stroke, fill }: { x: number; y: number; h: number; stroke: string; fill: string }) {
  const layers = [0, 1, 2, 3].map((i) => {
    const top = y - h + i * h * 0.2;
    const bot = top + h * 0.38;
    const half = h * (0.16 + i * 0.07);
    return `M${f(x)} ${f(top)} L${f(x + half)} ${f(bot)} Q${f(x)} ${f(bot - h * 0.06)} ${f(x - half)} ${f(bot)} Z`;
  });
  return (
    <g stroke={stroke} strokeWidth={3} strokeLinejoin="round" fill={fill}>
      <path d={`M${f(x)} ${f(y - h * 0.2)} V${f(y)}`} fill="none" />
      {layers.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

const FLAG_COLORS = ["#2C58A6", "#FFFFFF", "#C8372D", "#3F8A4E", "#F2C14E"];
function PrayerFlags({ a, b, c, n = 11, stroke }: { a: P; b: P; c: P; n?: number; stroke: string }) {
  const flags = Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const p = qb(a, c, b, t);
    const p2 = qb(a, c, b, Math.min(1, t + 0.02));
    const ang = f((Math.atan2(p2[1] - p[1], p2[0] - p[0]) * 180) / Math.PI);
    return { p, ang, color: FLAG_COLORS[i % 5] };
  });
  return (
    <g>
      <path d={`M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`} stroke={stroke} strokeWidth={3} fill="none" />
      {flags.map((f, i) => (
        <g key={i} transform={`translate(${f.p[0]} ${f.p[1]}) rotate(${f.ang * 0.6})`}>
          <path d="M-15 0 H15 L13 40 H-13 Z" fill={f.color} stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M-6 14 H6 M-6 22 H6" stroke={stroke} strokeWidth={1.6} opacity={0.5} />
        </g>
      ))}
    </g>
  );
}

function Monk({ x, y, s = 1, stroke, robe, umbrella }: { x: number; y: number; s?: number; stroke: string; robe: string; umbrella: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={stroke} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-46 -96 Q0 -138 46 -96 Q34 -101 23 -96 Q12 -101 0 -96 Q-12 -101 -23 -96 Q-34 -101 -46 -96 Z" fill={umbrella} />
      <path d="M0 -118 V-128 M0 -96 V-58" fill="none" />
      <circle cx={-2} cy={-68} r={11} fill="none" />
      <path d="M-14 -54 C-22 -36 -26 -14 -28 0 L24 0 C22 -14 19 -36 12 -54 Q-1 -60 -14 -54 Z" fill={robe} />
      <path d="M-14 -54 C-2 -42 10 -24 22 -6" fill="none" />
      <path d="M12 -50 C18 -44 10 -60 2 -62" fill="none" />
      <path d="M-14 0 V8 M10 0 L14 8" fill="none" />
    </g>
  );
}

function Stupa({ x, y, s = 1, stroke, fill, accent }: { x: number; y: number; s?: number; stroke: string; fill: string; accent: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={stroke} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round">
      <path d="M-70 0 H70 V-18 H-70 Z" fill={fill} />
      <path d="M-54 -18 H54 V-34 H-54 Z" fill={fill} />
      <path d="M-46 -34 A46 46 0 0 1 46 -34 Z" fill={fill} />
      <path d="M-14 -80 H14 V-64 H-14 Z" fill={accent} />
      <path d="M-11 -80 L-4 -140 H4 L11 -80" fill={fill} />
      <path d="M-9 -94 H9 M-7 -108 H7 M-6 -122 H6" fill="none" />
      <path d="M-8 -150 Q0 -138 8 -150" fill="none" />
      <circle cx={0} cy={-158} r={4} fill={accent} />
    </g>
  );
}

export function HimalayaScene({ variant, pal, w = 1080, h = 440 }: { variant: number; pal: Palette; w?: number; h?: number }) {
  const s = pal.art;
  const snow = pal.dark ? pal.ink : "#FFFFFF";
  const v = variant % 3;
  const back: P[] = [[0, 290], [90, 220], [150, 250], [260, 120], [340, 205], [420, 170], [520, 250], [640, 92], [740, 205], [820, 165], [900, 235], [1000, 140], [1080, 215]];
  const front = "M0 372 C180 322 330 382 520 346 S880 312 1080 356 L1080 440 L0 440 Z";
  return (
    <svg viewBox="0 0 1080 440" width={w} height={h} preserveAspectRatio="xMidYMax slice" style={{ display: "block" }}>
      <Range pts={back} stroke={s} snow={snow} fill={pal.bg} />
      <path d={front} fill={pal.bg} stroke={s} strokeWidth={4} />
      {v === 0 && (
        <>
          <PrayerFlags a={[-10, 40]} b={[520, 110]} c={[260, 170]} n={10} stroke={s} />
          {[60, 130, 880, 950, 1020].map((x, i) => (
            <Pine key={x} x={x} y={440} h={[150, 110, 120, 170, 130][i]} stroke={s} fill={pal.bg} />
          ))}
          <Monk x={560} y={385} s={0.95} stroke={s} robe={pal.accent2} umbrella={pal.accent} />
        </>
      )}
      {v === 1 && (
        <>
          <PrayerFlags a={[560, 70]} b={[1090, 30]} c={[820, 150]} n={10} stroke={s} />
          <Stupa x={300} y={400} s={1.05} stroke={s} fill={pal.bg} accent={pal.accent} />
          <Monk x={430} y={402} s={0.8} stroke={s} robe={pal.accent2} umbrella={pal.accent} />
          {[40, 760, 840, 930, 1030].map((x, i) => (
            <Pine key={x} x={x} y={440} h={[140, 120, 175, 135, 160][i]} stroke={s} fill={pal.bg} />
          ))}
        </>
      )}
      {v === 2 && (
        <>
          <PrayerFlags a={[-10, 120]} b={[1090, 90]} c={[540, 230]} n={18} stroke={s} />
          {[40, 120, 200, 300, 760, 850, 930, 1010, 1080].map((x, i) => (
            <Pine key={x} x={x} y={440} h={[160, 120, 145, 105, 115, 165, 130, 175, 120][i]} stroke={s} fill={pal.bg} />
          ))}
          <Birds x={600} y={60} stroke={s} s={0.9} />
        </>
      )}
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
  w?: number;
  h?: number;
  hotpot?: boolean;
}) {
  if (hotpot && variant % 4 === 3) {
    return (
      <div style={{ width: w, height: h, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
        <HotpotArt color={pal.art} width={Math.min(w * 0.75, h * 1.45)} />
      </div>
    );
  }
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
