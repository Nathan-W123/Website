'use client';

import { Rough } from '@/components/sketch/rough';

/**
 * Shared cartoon-ink parts: thin wobbly outlines, solid offset shadows, flat
 * grey tones for side faces, stipple for shading, wood grain, bolts and rope.
 * Black ink on white; no hatching anywhere.
 */

export const INK = '#111';
export const TONE = '#cfcfcf';
export const TONE_DARK = '#8c8c8c';

/** Outline options: thin outer line, white fill. */
export const outline = (w: number, seed: number) => ({ stroke: INK, strokeWidth: w, roughness: 1.1, bowing: 0.8, fill: '#fff', fillStyle: 'solid' as const, seed });
/** Solid black offset shadow behind a board. */
export const shadow = (seed: number) => ({ stroke: 'none', fill: INK, fillStyle: 'solid' as const, roughness: 0.6, seed });
/** Old callers' edge shading: now a flat tone, never hatching. */
export const hatch = (seed: number, _angle?: number, _gap?: number) => tone(seed);
/** Flat grey tone (cel shading) with a wobbly edge and no outline. */
export const tone = (seed: number, fill = TONE) => ({ stroke: 'none', fill, fillStyle: 'solid' as const, roughness: 0.7, seed });

/** Integer PRNG (mulberry32): identical on server and client. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inside = (pts: [number, number][], x: number, y: number) => {
  let ok = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
};

/**
 * Stipple shading inside a polygon: dots that get denser toward one edge.
 * `density` is dots per 1000 square units at the dense edge.
 */
export function Stipple({ points, seed, density = 6, from = 'bottom', r = 1.4, fill = INK }: { points: [number, number][]; seed: number; density?: number; from?: 'top' | 'bottom' | 'left' | 'right'; r?: number; fill?: string }) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const area = (x1 - x0) * (y1 - y0);
  const rnd = prng(seed);
  const n = Math.round((area / 1000) * density * 2);
  const dots: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    const t = from === 'bottom' ? (y - y0) / (y1 - y0) : from === 'top' ? (y1 - y) / (y1 - y0) : from === 'right' ? (x - x0) / (x1 - x0) : (x1 - x) / (x1 - x0);
    if (rnd() > t * t) continue;
    if (!inside(points, x, y)) continue;
    dots.push(`M${x.toFixed(1)} ${y.toFixed(1)}h0.01`);
  }
  return <path d={dots.join('')} stroke={fill} strokeWidth={r * 2} strokeLinecap="round" fill="none" />;
}

/** A wavy wood-grain line from (x1,y) to (x2,y). */
export function Grain({ x1, x2, y, amp = 4, seed, w = 1.4 }: { x1: number; x2: number; y: number; amp?: number; seed: number; w?: number }) {
  const l = x2 - x1;
  const d = `M ${x1} ${y} C ${x1 + l * 0.2} ${y - amp}, ${x1 + l * 0.3} ${y + amp}, ${x1 + l * 0.5} ${y} S ${x1 + l * 0.8} ${y - amp}, ${x2} ${y + amp * 0.4}`;
  return <Rough kind="path" d={d} seed={seed} opts={{ stroke: INK, strokeWidth: w, roughness: 0.8, bowing: 0.5, fill: 'none', disableMultiStroke: true }} />;
}

/** Vertical grain for a post. */
export function GrainV({ x, y1, y2, amp = 5, seed, w = 1.4 }: { x: number; y1: number; y2: number; amp?: number; seed: number; w?: number }) {
  const l = y2 - y1;
  const d = `M ${x} ${y1} C ${x - amp} ${y1 + l * 0.2}, ${x + amp} ${y1 + l * 0.35}, ${x} ${y1 + l * 0.5} S ${x - amp} ${y1 + l * 0.8}, ${x + amp * 0.4} ${y2}`;
  return <Rough kind="path" d={d} seed={seed} opts={{ stroke: INK, strokeWidth: w, roughness: 0.8, bowing: 0.5, fill: 'none', disableMultiStroke: true }} />;
}

/** A knot in the wood. */
export function Knot({ cx, cy, seed, s = 1 }: { cx: number; cy: number; seed: number; s?: number }) {
  return (
    <g>
      <Rough kind="ellipse" cx={cx} cy={cy} w={20 * s} h={30 * s} seed={seed} opts={{ stroke: INK, strokeWidth: 1.6, roughness: 1, fill: 'none', disableMultiStroke: true }} />
      <Rough kind="ellipse" cx={cx + 1} cy={cy - 1} w={9 * s} h={14 * s} seed={seed + 1} opts={{ stroke: INK, strokeWidth: 1.4, roughness: 1, fill: INK, fillStyle: 'solid' }} />
    </g>
  );
}

/** A bolt head: circle with a slot. */
export function Bolt({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={TONE} stroke={INK} strokeWidth={2} />
      <line x1={cx - r * 0.55} y1={cy - r * 0.35} x2={cx + r * 0.55} y2={cy + r * 0.35} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

/** Twisted rope: a wobbly line with short diagonal ticks. */
export function Rope({ x1, y1, x2, y2, seed, width = 3 }: { x1: number; y1: number; x2: number; y2: number; seed: number; width?: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const px = -uy, py = ux;
  const step = 12;
  const ticks: [number, number, number, number][] = [];
  for (let s = step * 0.8; s < len - 4; s += step) {
    const cx = x1 + ux * s, cy = y1 + uy * s;
    ticks.push([cx - px * 4 - ux * 3, cy - py * 4 - uy * 3, cx + px * 4 + ux * 3, cy + py * 4 + uy * 3]);
  }
  return (
    <g>
      <Rough kind="line" x1={x1} y1={y1} x2={x2} y2={y2} seed={seed} opts={{ stroke: INK, strokeWidth: width, roughness: 0.7, bowing: 0.5, disableMultiStroke: true }} />
      {ticks.map((t, i) => (
        <line key={i} x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** A metal ring a rope ties to. */
export function Ring({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth={2.2} />;
}

/** Corner-clipped board outline (an octagon-ish plank). */
export const boardPoints = (x: number, y: number, w: number, h: number, c = 14): [number, number][] => [
  [x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c],
];

/**
 * A wooden board: solid offset shadow, a grey side face below (thickness),
 * thin outline, grain, a few stipple dots along the lower edge, optional bolts.
 */
export function Board({ x, y, w, h, seed, grain = 2, edge = 10, bolts = true, corner = 14 }: { x: number; y: number; w: number; h: number; seed: number; grain?: number; edge?: number; bolts?: boolean; corner?: number }) {
  const pts = boardPoints(x, y, w, h, corner);
  const face: [number, number][] = [[x, y + h - corner], [x + corner, y + h], [x + w - corner, y + h], [x + w, y + h - corner], [x + w, y + h - corner + edge], [x + w - corner, y + h + edge], [x + corner, y + h + edge], [x, y + h - corner + edge]];
  return (
    <g>
      <Rough kind="poly" points={pts.map(([a, b]) => [a + 10, b + 12])} seed={seed} opts={shadow(seed)} />
      <Rough kind="poly" points={face} seed={seed + 2} opts={{ ...tone(seed + 2, TONE_DARK), stroke: INK, strokeWidth: 2 }} />
      <Rough kind="poly" points={pts} seed={seed + 1} opts={outline(3, seed + 1)} />
      {Array.from({ length: grain }, (_, i) => (
        <Grain key={i} x1={x + 28 + i * 10} x2={x + w - 30 - i * 14} y={y + h * ((i + 1) / (grain + 1)) - 6} amp={3 + i} seed={seed + 10 + i} />
      ))}
      <Stipple points={[[x + 4, y + h * 0.7], [x + w - 4, y + h * 0.7], [x + w - 4, y + h - 3], [x + 4, y + h - 3]]} seed={seed + 3} density={5} from="bottom" r={1.2} />
      {bolts && (
        <>
          <Bolt cx={x + 24} cy={y + 24} r={7} />
          <Bolt cx={x + w - 24} cy={y + 24} r={7} />
        </>
      )}
    </g>
  );
}
