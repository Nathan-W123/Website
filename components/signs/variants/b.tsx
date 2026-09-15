'use client';

import { useEffect, useState } from 'react';
import { Rough } from '@/components/sketch/rough';
import type { Plank } from '../signpost';

/**
 * Cel-shaded cartoon signpost. Thin clean ink outlines; every board is a 3D
 * slab with a flat mid-grey end face and a darker grey underside; each board
 * throws a solid black shadow onto the post; wood grain is flat light-grey
 * streaks plus thin dark lines. Planks tilt at their own angles and stack
 * tightly on the post, which hides behind the title board at the top.
 * No hatching anywhere. Everything is deterministic: rough.js gets a seed and
 * every chip, crack, knot and speck comes from a seeded integer PRNG.
 */

const INK = '#111';
const LINE = '#333';
const DARK = '#555';
const MID = '#9a9a9a';
const LIGHT = '#d9d9d9';

type Pt = [number, number];

/** mulberry32: integer PRNG so server and client draw the same specks. */
function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const r1 = (v: number) => Math.round(v * 10) / 10;
const pstr = (pts: Pt[]) => pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Side faces of a slab: the front polygon extruded along (ex, ey). Only faces turned toward the extrusion are visible. */
function slabFaces(pts: Pt[], ex: number, ey: number): { pts: Pt[]; tone: string }[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const sgn = area > 0 ? 1 : -1;
  const el = Math.hypot(ex, ey);
  const faces: { pts: Pt[]; tone: string }[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.5) continue;
    const nx = (sgn * dy) / len;
    const ny = (-sgn * dx) / len;
    if ((nx * ex + ny * ey) / el <= 0.03) continue;
    // light from the upper left: undersides go dark, end faces mid grey
    const tone = nx * -0.45 + ny * -0.89 < -0.6 ? DARK : MID;
    faces.push({ pts: [a, b, [b[0] + ex, b[1] + ey], [a[0] + ex, a[1] + ey]], tone });
  }
  return faces;
}

/** A board: grey side faces, then the white front face with a thin rough outline. */
function Slab({ pts, ex, ey, seed, lw = 3 }: { pts: Pt[]; ex: number; ey: number; seed: number; lw?: number }) {
  return (
    <>
      {slabFaces(pts, ex, ey).map((f, i) => {
        const [a, b] = f.pts;
        const long = f.tone === MID && Math.hypot(b[0] - a[0], b[1] - a[1]) > 24;
        return (
          <g key={i}>
            <polygon points={pstr(f.pts)} fill={f.tone} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
            {long &&
              [0.3, 0.68].map((t, q) => (
                <line key={q} x1={r1(a[0] + (b[0] - a[0]) * t + ex * 0.15)} y1={r1(a[1] + (b[1] - a[1]) * t + ey * 0.15)} x2={r1(a[0] + (b[0] - a[0]) * (t + 0.04) + ex * 0.8)} y2={r1(a[1] + (b[1] - a[1]) * (t + 0.04) + ey * 0.8)} stroke={DARK} strokeWidth={1.3} strokeLinecap="round" />
              ))}
          </g>
        );
      })}
      <Rough kind="poly" points={pts} seed={seed} opts={{ stroke: INK, strokeWidth: lw, roughness: 0.7, bowing: 0.5, fill: '#fff', fillStyle: 'solid', disableMultiStroke: true }} />
    </>
  );
}

/** Arrow plank outline with chipped edges and a rough-cut (or second pointed) tail. s=+1 points right. */
function arrow(r: Rng, s: number, xt: number, xh: number, y0: number, h: number, tip: number, twoEnds: boolean): Pt[] {
  const mid = y0 + h / 2;
  const j = (a: number) => (r() * 2 - 1) * a;
  const tailIn = twoEnds ? tip * 0.65 : 6;
  const bodyStart = xt + s * tailIn;
  const bodyEnd = xh - s * tip;
  const bodyLen = Math.abs(bodyEnd - bodyStart);
  const chips = (y: number, dir: number, count: number): Pt[] => {
    const out: Pt[] = [];
    for (let k = 0; k < count; k++) {
      const t = 0.08 + ((k + 0.15 + r() * 0.7) / count) * 0.84;
      const x = bodyStart + s * bodyLen * t;
      const w = 7 + r() * 11;
      const d = 2.5 + r() * 3;
      out.push([x - (s * w) / 2, y], [x - s * w * 0.15, y + dir * d], [x + (s * w) / 2, y]);
    }
    return out;
  };
  const top = chips(y0, 1, 1 + Math.floor(r() * 2));
  const bot = chips(y0 + h, -1, 1 + Math.floor(r() * 2));
  const headChip: Pt[] = r() < 0.7 ? [[bodyEnd + s * tip * 0.35, y0 + h * 0.18], [bodyEnd + s * tip * 0.4, y0 + h * 0.24], [bodyEnd + s * tip * 0.5, y0 + h * 0.27]] : [];
  const head: Pt[] = [
    [bodyEnd, y0 + j(1.5)],
    ...headChip,
    [xh - s * 3, mid - 6 + j(2)],
    [xh, mid + 1 + j(2)],
    [xh - s * 2, mid + 6 + j(2)],
    [bodyEnd - s * 2, y0 + h + j(1.5)],
  ];
  const tail: Pt[] = twoEnds
    ? [[xt + s * tailIn, y0 + h], [xt + s * 2, mid + 4 + j(3)], [xt, mid - 3 + j(3)], [xt + s * tailIn, y0]]
    : [[xt + s * (2 + r() * 4), y0 + h], [xt - s * (1 + r() * 3), y0 + h * (0.58 + j(0.08))], [xt + s * (2 + r() * 3), y0 + h * (0.3 + j(0.08))], [xt + s * r() * 4, y0]];
  return [...top, ...head, ...bot.reverse(), ...tail];
}

/** Wavy grain lines across a body region. */
function grain(r: Rng, xa: number, xb: number, y0: number, h: number, count: number): string[] {
  const j = (a: number) => (r() * 2 - 1) * a;
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    const y = y0 + (h * (k + 0.75)) / (count + 0.5) + j(3);
    const x1 = xa + r() * 26;
    const x2 = xb - r() * 26;
    const L = x2 - x1;
    const amp = 1.5 + r() * 2.5;
    const segs = 2 + Math.floor(r() * 2);
    let d = `M ${r1(x1)} ${r1(y + j(2))}`;
    for (let q = 0; q < segs; q++) {
      const xs = x1 + (L * q) / segs;
      const xe = x1 + (L * (q + 1)) / segs;
      d += ` C ${r1(xs + (L / segs) * 0.3)} ${r1(y + j(amp))}, ${r1(xs + (L / segs) * 0.7)} ${r1(y + j(amp))}, ${r1(xe)} ${r1(y + j(amp * 0.6))}`;
    }
    out.push(d);
  }
  return out;
}

/** Vertical grain for the post. */
function grainV(r: Rng, x: number, ya: number, yb: number, amp: number): string {
  const j = (a: number) => (r() * 2 - 1) * a;
  const L = yb - ya;
  const segs = 4;
  let d = `M ${r1(x + j(2))} ${r1(ya)}`;
  for (let q = 0; q < segs; q++) {
    const ys = ya + (L * q) / segs;
    const ye = ya + (L * (q + 1)) / segs;
    d += ` C ${r1(x + j(amp))} ${r1(ys + (L / segs) * 0.3)}, ${r1(x + j(amp))} ${r1(ys + (L / segs) * 0.7)}, ${r1(x + j(amp * 0.6))} ${r1(ye)}`;
  }
  return d;
}

/** Flat light-grey grain streak: a long thin lens. */
function streak(r: Rng, x1: number, x2: number, y: number, t: number): Pt[] {
  const j = (a: number) => (r() * 2 - 1) * a;
  const L = x2 - x1;
  return [
    [x1, y],
    [x1 + L * 0.25, y - t + j(1)],
    [x1 + L * 0.6, y - t * 0.9 + j(1)],
    [x2, y + 0.5 + j(1)],
    [x1 + L * 0.65, y + t * 0.8 + j(1)],
    [x1 + L * 0.3, y + t + j(1)],
  ];
}

/** A split running in from an end: a jittered polyline with one fork. */
function crack(r: Rng, x: number, y: number, dir: number, len: number): string {
  const j = (a: number) => (r() * 2 - 1) * a;
  const steps = 3 + Math.floor(r() * 2);
  let d = `M ${r1(x)} ${r1(y)}`;
  let cx = x;
  let cy = y;
  let fork = '';
  for (let k = 0; k < steps; k++) {
    cx += (dir * len) / steps;
    cy += j(3);
    d += ` L ${r1(cx)} ${r1(cy)}`;
    if (k === 1) fork = ` M ${r1(cx)} ${r1(cy)} l ${r1(dir * (10 + r() * 14))} ${r1((r() < 0.5 ? -1 : 1) * (4 + r() * 5))}`;
  }
  return d + fork;
}

/** Short weathering ticks along the grain plus a few dark specks. */
function Weather({ r, xa, xb, ya, yb, ticks, specks }: { r: Rng; xa: number; xb: number; ya: number; yb: number; ticks: number; specks: number }) {
  const t: [number, number, number][] = [];
  for (let k = 0; k < ticks; k++) t.push([xa + r() * (xb - xa), ya + r() * (yb - ya), 4 + r() * 8]);
  const s: [number, number, number][] = [];
  for (let k = 0; k < specks; k++) s.push([xa + r() * (xb - xa), ya + r() * (yb - ya), 0.8 + r() * 1]);
  return (
    <>
      {t.map(([x, y, l], i) => (
        <line key={i} x1={r1(x)} y1={r1(y)} x2={r1(x + l)} y2={r1(y + 0.5)} stroke={DARK} strokeWidth={1.2} strokeLinecap="round" />
      ))}
      {s.map(([x, y, d], i) => (
        <circle key={i} cx={r1(x)} cy={r1(y)} r={r1(d)} fill={DARK} />
      ))}
    </>
  );
}

/** Nail head: black dot with a white glint. */
function Nail({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={r1(cx)} cy={r1(cy)} r={r} fill={INK} />
      <circle cx={r1(cx - r * 0.32)} cy={r1(cy - r * 0.32)} r={r1(r * 0.34)} fill="#fff" />
    </>
  );
}

/** Knot: light ring with a dark eye. */
function Knot({ cx, cy, seed }: { cx: number; cy: number; seed: number }) {
  return (
    <>
      <Rough kind="ellipse" cx={cx} cy={cy} w={22} h={14} seed={seed} opts={{ stroke: INK, strokeWidth: 1.6, roughness: 0.8, fill: LIGHT, fillStyle: 'solid', disableMultiStroke: true }} />
      <ellipse cx={cx + 1} cy={cy} rx={5} ry={3} fill={DARK} />
    </>
  );
}

/** Corner-chipped board outline with a couple of dents on the long edges. */
function boardPts(r: Rng, x: number, y: number, w: number, h: number): Pt[] {
  const j = (a: number) => (r() * 2 - 1) * a;
  const c = 16;
  const dent = (px: number, py: number, dir: number): Pt[] => {
    const dw = 10 + r() * 10;
    return [[px - dw / 2, py], [px - dw * 0.1, py + dir * (3 + r() * 2.5)], [px + dw / 2, py]];
  };
  return [
    [x + c, y + j(1)],
    ...dent(x + w * (0.2 + r() * 0.15), y, 1),
    ...dent(x + w * (0.6 + r() * 0.2), y, 1),
    [x + w - c, y],
    [x + w + j(1), y + c],
    [x + w - 2, y + h - c + 4],
    [x + w - c - 6, y + h],
    ...dent(x + w * (0.45 + r() * 0.2), y + h, -1),
    [x + c, y + h + j(1)],
    [x + j(1), y + h - c],
    [x + 3, y + c - 3],
  ];
}

const TILTS = [-7, 6, -9, 5, 8, -6, 4, -8];
const EX = 7;
const EY = 9;

export function Signpost({ title, planks, seed = 1, onPlank }: { title: string; planks: Plank[]; seed?: number; onPlank?: (p: Plank) => void }) {
  // phones get shorter planks so the whole post scales up to fill the width
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const fit = () => setCompact(window.innerWidth < 720);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const k = compact ? 0.82 : 1;
  const W = compact ? 900 : 1100;
  const postX = W / 2;
  const boardW = 600 * k;
  const boardH = 118;
  const boardY = 64;
  const boardMid = boardY + boardH / 2;
  const boardTilt = -3;
  const plankH = 92;
  const step = plankH + 22;
  const top = boardY + boardH + 30;
  const baseY = top + (planks.length - 1) * step + plankH + 230;
  const H = baseY + 72;
  const postTop = boardY + 34;
  const postW = 34;
  const postEdge = (y: number, side: number) => postX + side * (postW + (5 * (y - postTop)) / (baseY - postTop));

  const g = rng(seed * 7919 + 13);
  const j = (a: number) => (g() * 2 - 1) * a;

  /** Solid black shadow a tilted board throws onto the post, just below its underside. */
  const cast = (yBottom: number, mid: number, tilt: number, depth: number, key: string) => {
    const th = rad(tilt);
    const p0x = postX - (yBottom - mid) * Math.sin(th) + EX;
    const p0y = mid + (yBottom - mid) * Math.cos(th) + EY;
    const yAt = (x: number) => p0y + (x - p0x) * Math.tan(th);
    const xl = postEdge(mid, -1) + 1;
    const xr = postEdge(mid, 1) - 1;
    const pts: Pt[] = [[xl, yAt(xl) - 1], [xr, yAt(xr) - 1], [xr, yAt(xr) + depth + 3], [xl, yAt(xl) + depth]];
    return <polygon key={key} points={pstr(pts)} fill={INK} />;
  };

  // ground specks
  const specks: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const a = g() * Math.PI * 2;
    const d = Math.sqrt(g());
    specks.push([postX + 16 + Math.cos(a) * d * 215 * k, baseY + 12 + Math.sin(a) * d * 22, 0.8 + g() * 1.2]);
  }
  const tuft = (x: number, y: number, n: number, hgt: number, sd: number) => {
    const rr = rng(sd);
    const lines: string[] = [];
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) * (7 + rr() * 4);
      const hh = hgt * (0.55 + rr() * 0.6);
      lines.push(`M ${r1(x + dx * 0.3)} ${r1(y)} Q ${r1(x + dx * 0.9)} ${r1(y - hh * 0.55)} ${r1(x + dx * 1.6)} ${r1(y - hh)}`);
    }
    return lines.map((d, i) => <path key={i} d={d} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />);
  };

  const postGrain = [grainV(g, postX - 14, postTop, baseY - 2, 3), grainV(g, postX + 2, postTop, baseY - 2, 4), grainV(g, postX + 17, postTop + 40, baseY - 2, 3)];
  const bpts = boardPts(g, postX - boardW / 2, boardY, boardW, boardH);
  const boardGrain = grain(g, postX - boardW / 2 + 30, postX + boardW / 2 - 30, boardY + 8, boardH - 16, 4);
  const bStreak1 = streak(g, postX - boardW * 0.42, postX - boardW * 0.05, boardY + boardH * 0.24, 5);
  const bStreak2 = streak(g, postX + boardW * 0.02, postX + boardW * 0.44, boardY + boardH * 0.82, 5);
  // mud line where the post meets the ground
  const dirt: Pt[] = [[postEdge(baseY, -1) + 1, baseY]];
  for (let i = 0; i <= 8; i++) dirt.push([postEdge(baseY, -1) + 1 + (i * (postW * 2 + 8)) / 8, baseY - 3 - g() * 5]);
  dirt.push([postEdge(baseY, 1) - 1, baseY]);
  const postSideL = postEdge(postTop, 1);
  const postSideB = postEdge(baseY, 1);

  return (
    <svg className="sg-post" viewBox={`0 0 ${W} ${H}`} aria-label={`${title} signpost`}>
      {/* ground: flat grey patch, the post's shadow, dirt specks */}
      <ellipse cx={postX + 16} cy={baseY + 12} rx={220 * k} ry={24} fill={LIGHT} />
      <polygon points={pstr([[postX + 20, baseY + 2], [postX + 165 * k, baseY - 4], [postX + 190 * k, baseY + 14], [postX + 30, baseY + 16]])} fill={MID} />
      {specks.map(([x, y, d], i) => (
        <circle key={i} cx={r1(x)} cy={r1(y)} r={r1(d)} fill={DARK} />
      ))}
      {/* post: grey side face, white front, grain, a knot, a split at the foot */}
      <polygon points={pstr([[postSideL, postTop], [postSideL + 16, postTop + 8], [postSideB + 16, baseY + 8], [postSideB, baseY]])} fill={MID} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <Rough kind="poly" points={[[postEdge(postTop, -1), postTop], [postSideL, postTop], [postSideB, baseY], [postEdge(baseY, -1), baseY]]} seed={seed + 1} opts={{ stroke: INK, strokeWidth: 3, roughness: 0.6, bowing: 0.4, fill: '#fff', fillStyle: 'solid', disableMultiStroke: true }} />
      <polygon points={pstr([[postX - 26, baseY - 150], [postX - 22, baseY - 120], [postX - 21, baseY - 40], [postX - 25, baseY - 8], [postX - 29, baseY - 60], [postX - 30, baseY - 110]])} fill={LIGHT} />
      <polygon points={pstr([[postX + 8, postTop + 60], [postX + 13, postTop + 120], [postX + 12, postTop + 260], [postX + 6, postTop + 300], [postX + 4, postTop + 180]])} fill={LIGHT} />
      {postGrain.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={LINE} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <Knot cx={postX + 9} cy={baseY - 96} seed={seed + 2} />
      <line x1={r1(postSideL + 6)} y1={postTop + 40} x2={r1(postSideB + 6)} y2={baseY - 20} stroke={DARK} strokeWidth={1.3} strokeLinecap="round" />
      <line x1={r1(postSideL + 11)} y1={postTop + 120} x2={r1(postSideB + 11)} y2={baseY - 60} stroke={DARK} strokeWidth={1.3} strokeLinecap="round" />
      <polygon points={pstr(dirt)} fill={MID} />
      <path d={`M ${r1(postX - 6 + j(3))} ${baseY} L ${r1(postX - 8 + j(2))} ${baseY - 28} L ${r1(postX - 3 + j(2))} ${baseY - 52} L ${r1(postX - 7 + j(2))} ${baseY - 80} M ${r1(postX - 3)} ${baseY - 52} L ${r1(postX + 5 + j(2))} ${baseY - 66}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Weather r={g} xa={postX - 24} xb={postX + 22} ya={baseY - 170} yb={baseY - 6} ticks={5} specks={7} />
      {/* shadows the boards throw on the post */}
      {cast(boardY + boardH, boardMid, boardTilt, 9, 'cb')}
      {planks.map((p, i) => cast(top + i * step + plankH, top + i * step + plankH / 2, TILTS[i % TILTS.length], 9, `c${i}`))}
      {/* grass and pebbles at the foot */}
      {tuft(postX - 62, baseY + 4, 6, 44, seed + 31)}
      {tuft(postX - 150 * k, baseY + 12, 5, 30, seed + 32)}
      {tuft(postX + 66, baseY + 8, 6, 40, seed + 33)}
      {tuft(postX + 150 * k, baseY + 16, 4, 26, seed + 34)}
      <ellipse cx={postX - 105 * k} cy={baseY + 14} rx={9} ry={5} fill="#fff" stroke={INK} strokeWidth={1.6} />
      <path d={`M ${r1(postX - 114 * k)} ${baseY + 15} Q ${r1(postX - 105 * k)} ${baseY + 20} ${r1(postX - 96 * k)} ${baseY + 15}`} fill={MID} />
      <ellipse cx={postX + 112 * k} cy={baseY + 22} rx={7} ry={4} fill="#fff" stroke={INK} strokeWidth={1.6} />
      {/* title board: the topmost thing, hiding the post's top */}
      <g transform={`rotate(${boardTilt} ${postX} ${boardMid})`}>
        {(() => {
          const th = rad(boardTilt);
          const ex = EX * Math.cos(th) + EY * Math.sin(th);
          const ey = -EX * Math.sin(th) + EY * Math.cos(th);
          const x0 = postX - boardW / 2;
          return (
            <>
              <Slab pts={bpts} ex={ex} ey={ey} seed={seed + 3} lw={3.2} />
              <polygon points={pstr(bStreak1)} fill={LIGHT} />
              <polygon points={pstr(bStreak2)} fill={LIGHT} />
              {boardGrain.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={LINE} strokeWidth={1.8} strokeLinecap="round" />
              ))}
              <path d={crack(g, x0 + 2, boardY + boardH * 0.62, 1, 46)} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d={crack(g, x0 + boardW - 2, boardY + boardH * 0.3, -1, 38)} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <Weather r={g} xa={x0 + 30} xb={x0 + boardW - 30} ya={boardY + boardH - 22} yb={boardY + boardH - 5} ticks={4} specks={9} />
              <Nail cx={x0 + 26} cy={boardY + 24} />
              <Nail cx={x0 + boardW - 26} cy={boardY + 22} />
              <Nail cx={x0 + 24} cy={boardY + boardH - 22} />
              <Nail cx={x0 + boardW - 28} cy={boardY + boardH - 24} />
              <text x={postX} y={boardMid + 22} textAnchor="middle" className="sg-title" style={title.length > 12 ? { fontSize: 50 } : undefined}>
                {title}
              </text>
            </>
          );
        })()}
      </g>
      {/* planks, each at its own tilt, stacked tight on the post */}
      {planks.map((p, i) => {
        const s = p.dir === 'right' ? 1 : -1;
        const y0 = top + i * step;
        const mid = y0 + plankH / 2;
        const tilt = TILTS[i % TILTS.length];
        const th = rad(tilt);
        const ex = EX * Math.cos(th) + EY * Math.sin(th);
        const ey = -EX * Math.sin(th) + EY * Math.cos(th);
        const len = (p.small ? 470 : 660) * k;
        const tail = (p.small ? 100 : 125) * k;
        const tip = 72 * k;
        const xt = postX - s * tail;
        const xh = xt + s * len;
        const r = rng(seed * 1000 + i * 37 + 11);
        const twoEnds = i % 3 === 2;
        const pts = arrow(r, s, xt, xh, y0, plankH, tip, twoEnds);
        const bodyStart = xt + s * (twoEnds ? tip * 0.65 : 6);
        const bodyEnd = xh - s * tip;
        const xa = Math.min(bodyStart, bodyEnd);
        const xb = Math.max(bodyStart, bodyEnd);
        const lines = grain(r, xa + 4, xb - 4, y0 + 8, plankH - 16, p.small ? 2 : 3);
        const st1 = streak(r, xa + 20 + r() * 40, xa + (xb - xa) * (0.45 + r() * 0.15), y0 + plankH * (0.28 + r() * 0.1), 4.5);
        const st2 = streak(r, xa + (xb - xa) * (0.5 + r() * 0.1), xb - 16 - r() * 30, y0 + plankH * (0.72 + r() * 0.1), 4.5);
        const hasKnot = r() < 0.6;
        const knotX = xt + s * ((twoEnds ? tip * 0.65 : 0) + 48 + r() * 24);
        const knotY = y0 + plankH * (r() < 0.5 ? 0.26 : 0.74);
        const tailCrack = crack(r, xt + s * (twoEnds ? 8 : 2), mid + (r() * 2 - 1) * 12, s, 34 + r() * 36);
        const headCrack = r() < 0.6 ? crack(r, xh - s * tip * 0.45, mid + (r() * 2 - 1) * 8, -s, 26 + r() * 22) : null;
        const check = r() < 0.55 ? crack(r, xa + (xb - xa) * (0.55 + r() * 0.25), y0 + plankH * (0.2 + r() * 0.5), s, 14 + r() * 12) : null;
        const cx = (postX + s * (postW + 12) + bodyEnd) / 2;
        const long = p.label.length > 12;
        return (
          <a key={p.label} className="sg-plank" href={p.href} aria-label={p.label} onClick={() => onPlank?.(p)}>
            <g transform="translate(0 0)">
              <g transform={`rotate(${tilt} ${postX} ${mid})`}>
                <Slab pts={pts} ex={ex} ey={ey} seed={seed + 10 + i} />
                <polygon points={pstr(st1)} fill={LIGHT} />
                <polygon points={pstr(st2)} fill={LIGHT} />
                {lines.map((d, q) => (
                  <path key={q} d={d} fill="none" stroke={LINE} strokeWidth={1.8} strokeLinecap="round" />
                ))}
                {hasKnot && <Knot cx={knotX} cy={knotY} seed={seed + 40 + i} />}
                <path d={tailCrack} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                {headCrack && <path d={headCrack} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
                {check && <path d={check} fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />}
                <Weather r={r} xa={xa + 10} xb={xb - 10} ya={y0 + plankH - 20} yb={y0 + plankH - 5} ticks={6} specks={9} />
                <Nail cx={postX - 14} cy={mid - 13} />
                <Nail cx={postX + 14} cy={mid + 13} />
                <Nail cx={xt + s * (twoEnds ? tip * 0.65 + 16 : 22)} cy={mid + (r() * 2 - 1) * 6} r={5} />
                <text x={r1(cx)} y={mid + 18} textAnchor="middle" className={`sg-label${p.small ? ' sg-label-small' : ''}${long ? ' sg-label-long' : ''}`}>
                  {p.label}
                </text>
              </g>
            </g>
          </a>
        );
      })}
    </svg>
  );
}
