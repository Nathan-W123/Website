'use client';

import { useEffect, useState } from 'react';
import { Rough } from '@/components/sketch/rough';
import type { Plank } from '../signpost';

/**
 * Variant "a": a weathered trail signpost in black ink on white.
 *
 * Every arrow plank hangs at its own tilt and overlaps the post; ends are
 * split, corners chipped, edges uneven. Shading is stippled ink dots that
 * gather toward plank edges and under overlaps, plus flat light-grey
 * thickness faces. No hatching anywhere. Everything is seeded so the server
 * and the browser draw the same picture.
 */

const INK = '#111';
const FACE = '#d9d9d9';
const SHADE = '#c9c9c9';

type Pt = [number, number];
type Rnd = () => number;
type Dots = { s: string[]; l: string[] };
type Weight = (mx: number, my: number, nx: number, ny: number) => number;

/** Integer PRNG (mulberry32): identical on the server and in the browser. */
function mulberry32(seed: number): Rnd {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f1 = (v: number) => Math.round(v * 10) / 10;
const rng = (r: Rnd, lo: number, hi: number) => lo + (hi - lo) * r();

function inside(poly: Pt[], x: number, y: number): boolean {
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}
function signedArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a / 2;
}
const dot = (out: Dots, r: Rnd, x: number, y: number, big = 0.22) => {
  (r() < big ? out.l : out.s).push(`M${f1(x)} ${f1(y)}h.1`);
};

/** Dots just inside every edge of a polygon; density falls off away from the edge. */
function rim(poly: Pt[], r: Rnd, falloff: number, weight: Weight, out: Dots) {
  const o = signedArea(poly) > 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len, uy = dy / len;
    const nx = -uy * o, ny = ux * o;
    const w = weight((ax + bx) / 2, (ay + by) / 2, nx, ny);
    const n = Math.round(len * w);
    for (let k = 0; k < n; k++) {
      const t = r() * len;
      const d = 1.6 - falloff * Math.log(1 - r());
      const x = ax + ux * t + nx * d, y = ay + uy * t + ny * d;
      if (inside(poly, x, y)) dot(out, r, x, y);
    }
  }
}
/** Dots fading away from a segment on its (nx, ny) side. */
function band(a: Pt, b: Pt, nx: number, ny: number, r: Rnd, falloff: number, perPx: number, clip: (x: number, y: number) => boolean, out: Dots) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  const n = Math.round(len * perPx);
  for (let k = 0; k < n; k++) {
    const t = r();
    const d = 1 - falloff * Math.log(1 - r());
    const x = a[0] + dx * t + nx * d, y = a[1] + dy * t + ny * d;
    if (clip(x, y)) dot(out, r, x, y, 0.2);
  }
}
/** Sparse weathering specks inside a polygon, keeping clear of a zone. */
function specks(poly: Pt[], r: Rnd, count: number, keepOut: (x: number, y: number) => boolean, out: Dots) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  for (let k = 0, tries = 0; k < count && tries < count * 6; tries++) {
    const x = rng(r, x0, x1), y = rng(r, y0, y1);
    if (!inside(poly, x, y) || keepOut(x, y)) continue;
    dot(out, r, x, y, 0.4);
    k++;
  }
}

/** Bites a few corners out of a polygon. */
function chip(poly: Pt[], r: Rnd, chance: number, depth: number): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const c = poly[i], p = poly[(i + n - 1) % n], q = poly[(i + 1) % n];
    const lp = Math.hypot(p[0] - c[0], p[1] - c[1]), lq = Math.hypot(q[0] - c[0], q[1] - c[1]);
    if (r() > chance || lp < 40 || lq < 40) { out.push(c); continue; }
    const a = rng(r, depth * 0.8, depth * 1.6), b = rng(r, depth * 0.8, depth * 1.6);
    const ux = (p[0] - c[0]) / lp, uy = (p[1] - c[1]) / lp, vx = (q[0] - c[0]) / lq, vy = (q[1] - c[1]) / lq;
    const bx = ux + vx, by = uy + vy, bl = Math.hypot(bx, by) || 1;
    out.push([c[0] + ux * a, c[1] + uy * a], [c[0] + (bx / bl) * depth * 0.55, c[1] + (by / bl) * depth * 0.55], [c[0] + vx * b, c[1] + vy * b]);
  }
  return out;
}
/** Splits long edges and nudges the new points so the silhouette is uneven. */
function jitter(poly: Pt[], r: Rnd, step = 50, amp = 1.5): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    out.push(a);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.floor(len / step);
    if (k < 1) continue;
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    for (let j = 1; j <= k; j++) {
      const t = (j - rng(r, 0.2, 0.8)) / k;
      const d = rng(r, -amp, amp) * (r() < 0.15 ? 2.6 : 1);
      out.push([a[0] + (b[0] - a[0]) * t + nx * d, a[1] + (b[1] - a[1]) * t + ny * d]);
    }
  }
  return out.map(([x, y]) => [f1(x), f1(y)]);
}

/** A wavy grain line running horizontally. */
function grain(x1: number, x2: number, y: number, amp: number, r: Rnd): string {
  const steps = Math.max(1, Math.round(Math.abs(x2 - x1) / 110));
  const dx = (x2 - x1) / steps;
  let d = `M${f1(x1)} ${f1(y)}`;
  let sg = r() < 0.5 ? 1 : -1;
  for (let i = 0; i < steps; i++) {
    const xa = x1 + dx * i;
    const a1 = amp * rng(r, 0.5, 1) * sg, a2 = -amp * rng(r, 0.5, 1) * sg;
    d += `C${f1(xa + dx * 0.33)} ${f1(y + a1)} ${f1(xa + dx * 0.66)} ${f1(y + a2)} ${f1(xa + dx)} ${f1(y + rng(r, -0.5, 0.5) * amp)}`;
    sg = -sg;
  }
  return d;
}
/** A wavy grain line running vertically. */
function grainV(y1: number, y2: number, x: number, amp: number, r: Rnd): string {
  const steps = Math.max(1, Math.round(Math.abs(y2 - y1) / 120));
  const dy = (y2 - y1) / steps;
  let d = `M${f1(x)} ${f1(y1)}`;
  let sg = r() < 0.5 ? 1 : -1;
  for (let i = 0; i < steps; i++) {
    const ya = y1 + dy * i;
    const a1 = amp * rng(r, 0.5, 1) * sg, a2 = -amp * rng(r, 0.5, 1) * sg;
    d += `C${f1(x + a1)} ${f1(ya + dy * 0.33)} ${f1(x + a2)} ${f1(ya + dy * 0.66)} ${f1(x + rng(r, -0.5, 0.5) * amp)} ${f1(ya + dy)}`;
    sg = -sg;
  }
  return d;
}
/** A jagged split with a fork, running from (x, y) along the unit direction (dx, dy). */
function crack(x: number, y: number, dx: number, dy: number, len: number, r: Rnd): string {
  const px = -dy, py = dx;
  const n = 4 + Math.floor(r() * 3);
  let d = `M${f1(x)} ${f1(y)}`;
  let cx = x, cy = y, fx = x, fy = y, fk = 0;
  const forkAt = 1 + Math.floor(r() * (n - 2));
  for (let i = 1; i <= n; i++) {
    const t = (len / n) * rng(r, 0.6, 1.4);
    const w = rng(r, -4, 4);
    cx += dx * t + px * w; cy += dy * t + py * w;
    d += `L${f1(cx)} ${f1(cy)}`;
    if (i === forkAt) { fx = cx; fy = cy; fk = w < 0 ? 1 : -1; }
  }
  const fl = len * rng(r, 0.3, 0.5);
  d += `M${f1(fx)} ${f1(fy)}L${f1(fx + dx * fl * 0.5 + px * fk * 5)} ${f1(fy + dy * fl * 0.5 + py * fk * 5)}L${f1(fx + dx * fl + px * fk * 9)} ${f1(fy + dy * fl + py * fk * 9)}`;
  return d;
}

function Knot({ cx, cy, rx, ry, rot }: { cx: number; cy: number; rx: number; ry: number; rot: number }) {
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={INK} strokeWidth={1.6} />
      <ellipse cx={f1(cx - rx * 0.12)} cy={f1(cy + ry * 0.08)} rx={f1(rx * 0.64)} ry={f1(ry * 0.6)} fill="none" stroke={INK} strokeWidth={1.1} />
      <ellipse cx={f1(cx - rx * 0.2)} cy={f1(cy + ry * 0.12)} rx={f1(rx * 0.3)} ry={f1(ry * 0.28)} fill={INK} />
      <path d={`M${f1(cx + rx * 0.9)} ${f1(cy - ry * 0.2)}l${f1(rx * 0.9)} ${f1(-ry * 0.15)}l${f1(rx * 0.7)} ${f1(ry * 0.2)}`} fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** A screw head with a ring of rust dots and a drip below. Pushes its dots into `out`. */
function screw(key: string, cx: number, cy: number, rad: number, r: Rnd, out: Dots, cross: boolean) {
  const ang = rng(r, -0.6, 0.6) + (r() < 0.5 ? 0 : 1.2);
  const c = Math.cos(ang) * rad * 0.62, s = Math.sin(ang) * rad * 0.62;
  const ringN = Math.round(rad * 2.2);
  for (let k = 0; k < ringN; k++) {
    const a = rng(r, 0.15, 0.85) * Math.PI;
    const d = rad + 2.5 - 2.5 * Math.log(1 - r());
    dot(out, r, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.2);
  }
  const drip = Math.round(rng(r, 6, 14));
  for (let k = 0; k < drip; k++) {
    if (r() < k / drip) continue;
    dot(out, r, cx + rng(r, -1.6, 1.6), cy + rad + 3 + k * 1.9 + rng(r, -0.6, 0.6), 0.15);
  }
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={rad} fill="#fff" stroke={INK} strokeWidth={2.1} />
      <circle cx={cx} cy={cy} r={rad * 0.55} fill="none" stroke={INK} strokeWidth={0.9} opacity={0.5} />
      <line x1={f1(cx - c)} y1={f1(cy - s)} x2={f1(cx + c)} y2={f1(cy + s)} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      {cross && <line x1={f1(cx + s)} y1={f1(cy - c)} x2={f1(cx - s)} y2={f1(cy + c)} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />}
    </g>
  );
}

function DotLayer({ d }: { d: Dots }) {
  return (
    <>
      {d.s.length > 0 && <path d={d.s.join('')} fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />}
      {d.l.length > 0 && <path d={d.l.join('')} fill="none" stroke={INK} strokeWidth={2.3} strokeLinecap="round" />}
    </>
  );
}

const outline = (w: number) => ({ stroke: INK, strokeWidth: w, roughness: 0.9, bowing: 0.6, fill: '#fff', fillStyle: 'solid' as const, disableMultiStroke: true });
const face = (w: number) => ({ stroke: INK, strokeWidth: w, roughness: 0.8, bowing: 0.5, fill: FACE, fillStyle: 'solid' as const, disableMultiStroke: true });
const thin = { fill: 'none', stroke: INK, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Each plank's tilt in degrees (clockwise positive); the mix alternates so heads droop and rise. */
const TILT = [-6, -5, 7, 5, -8, -5, 6, 4];

export function Signpost({ title, planks, seed = 1, onPlank }: { title: string; planks: Plank[]; seed?: number; onPlank?: (p: Plank) => void }) {
  // phones get shorter planks so the whole post scales up to fill the width
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const fit = () => setCompact(window.innerWidth < 720);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const W = compact ? 900 : 1100;
  const px = W / 2;
  const h = 94, gap = 18, pitch = h + gap;
  const top = 264;
  const H = top + planks.length * pitch + 230;
  const baseY = H - 62;
  const boardW = compact ? 520 : 600, boardH = 118, boardY = 96;
  const postTop = boardY + 44;

  /* ---- post ---- */
  const rp = mulberry32(seed * 1013 + 5);
  const pw = 30, pwb = 37;
  const postPts = jitter([[px - pw, postTop], [px + pw, postTop], [px + pwb, baseY], [px - pwb, baseY]], rp, 70, 1.3);
  const sidePts: Pt[] = [[px + pw, postTop], [px + pw + 11, postTop + 6], [px + pwb + 11, baseY - 3], [px + pwb, baseY]];
  const postDots: Dots = { s: [], l: [] };
  const inPost = (x: number, y: number) => inside(postPts, x, y);
  rim(postPts, rp, 12, (_mx, _my, nx, ny) => (nx < -0.5 ? 1.5 : nx > 0.5 ? 0.3 : ny < -0.5 ? 0.9 : 0), postDots);
  const shadowStrips: Pt[][] = [];
  planks.forEach((_p, i) => {
    const yb = top + i * pitch + h;
    const t = Math.tan((TILT[i % TILT.length] * Math.PI) / 180);
    const a: Pt = [px - pwb, yb - pwb * t], b: Pt = [px + pwb, yb + pwb * t];
    shadowStrips.push([a, b, [b[0], b[1] + 14], [a[0], a[1] + 14]]);
    band(a, b, 0, 1, rp, 7, 1.7, inPost, postDots);
  });
  const lastBottom = top + planks.length * pitch - gap;
  const postGrain = [
    grainV(postTop + 30, baseY - 8, px - 17, 3, rp),
    grainV(postTop + 60, baseY - 40, px - 3, 2.5, rp),
    grainV(postTop + 20, baseY - 12, px + 13, 3, rp),
  ];
  const postCrack = crack(px - 9, baseY + 1, 0, -1, 96, rp);
  const postTicks: string[] = [];
  for (let k = 0; k < 7; k++) {
    const y = rng(rp, lastBottom + 10, baseY - 14), x = px + rng(rp, 16, 27);
    postTicks.push(`M${f1(x)} ${f1(y)}l${f1(rng(rp, -1, 1))} ${f1(rng(rp, 4, 9))}`);
  }

  /* ---- ground ---- */
  const rg = mulberry32(seed * 977 + 11);
  const ground: Dots = { s: [], l: [] };
  for (let k = 0; k < 760; k++) {
    const a = rg() * Math.PI * 2;
    const d = -78 * Math.log(1 - rg());
    const x = px + 8 + Math.cos(a) * d * 1.25, y = baseY + 12 + Math.sin(a) * d * 0.26;
    if (y > baseY - 4) dot(ground, rg, x, y, 0.25);
  }
  const tuft = (x: number, y: number, blades: number, r: Rnd) => {
    let d = '';
    for (let k = 0; k < blades; k++) {
      const bx = x + (k - (blades - 1) / 2) * rng(r, 4, 8);
      const ht = rng(r, 16, 42), lean = rng(r, -14, 14);
      d += `M${f1(bx)} ${f1(y)}Q${f1(bx + lean * 0.3)} ${f1(y - ht * 0.6)} ${f1(bx + lean)} ${f1(y - ht)}`;
    }
    return d;
  };
  const backGrass = tuft(px - 34, baseY + 2, 4, rg) + tuft(px + 30, baseY + 3, 3, rg);
  const frontGrass = [-236, -190, -150, -104, -60, 46, 84, 126, 172, 224].map((o) => tuft(px + o + rng(rg, -8, 8), baseY + rng(rg, 4, 14), 3 + Math.floor(rg() * 4), rg)).join('');

  /* ---- title board ---- */
  const rb = mulberry32(seed * 733 + 3);
  const bx = px - boardW / 2;
  const boardPts = jitter(chip([[bx, boardY], [bx + boardW, boardY], [bx + boardW, boardY + boardH], [bx, boardY + boardH]], rb, 0.8, 8), rb, 60, 1.4);
  const boardDots: Dots = { s: [], l: [] };
  rim(boardPts, rb, 7.5, (_mx, _my, nx, ny) => (ny < -0.5 ? 1.3 : ny > 0.5 ? 0.35 : 1.1), boardDots);
  specks(boardPts, rb, 34, (_x, y) => Math.abs(y - (boardY + boardH / 2)) < 28, boardDots);
  const boardGrain = [
    grain(bx + 18, bx + boardW - 24, boardY + 14, 2.4, rb),
    grain(bx + 70, bx + boardW - 140, boardY + 26, 2, rb),
    grain(bx + 26, bx + boardW - 40, boardY + boardH - 26, 2, rb),
    grain(bx + 12, bx + boardW - 16, boardY + boardH - 13, 2.6, rb),
  ];
  const boardCrack = crack(bx + boardW - 1, boardY + boardH * 0.62, -1, 0, 64, rb);
  const boardCrack2 = crack(bx + 1, boardY + boardH * 0.3, 1, 0, 40, rb);
  const boardScrews = [screw('l', bx + 34, boardY + boardH / 2 + 2, 8, rb, boardDots, true), screw('r', bx + boardW - 34, boardY + boardH / 2 - 3, 8, rb, boardDots, true)];

  return (
    <svg className="sg-post" viewBox={`0 0 ${W} ${H}`} aria-label={`${title} signpost`}>
      {/* ground: stippled patch, pebbles, grass behind the post */}
      <ellipse cx={px + 6} cy={baseY + 10} rx={118} ry={17} fill={FACE} />
      <DotLayer d={ground} />
      <Rough kind="ellipse" cx={px - 150} cy={baseY + 16} w={30} h={17} seed={seed + 61} opts={face(2)} />
      <Rough kind="ellipse" cx={px + 128} cy={baseY + 24} w={22} h={13} seed={seed + 62} opts={face(2)} />
      <Rough kind="ellipse" cx={px + 176} cy={baseY + 8} w={34} h={19} seed={seed + 63} opts={face(2)} />
      <path d={backGrass} {...thin} strokeWidth={2} />
      {/* post: grey side face, white front, grain, knots, a split from the foot, cast shadows under each plank */}
      <Rough kind="poly" points={sidePts} seed={seed + 2} opts={face(2.4)} />
      <Rough kind="poly" points={postPts} seed={seed + 1} opts={outline(3)} />
      {postGrain.map((d, i) => (
        <path key={i} d={d} {...thin} strokeWidth={1.3} />
      ))}
      <Knot cx={px + 8} cy={lastBottom + 64} rx={10} ry={6} rot={84} />
      <Knot cx={px - 11} cy={postTop + 96} rx={8} ry={4.5} rot={96} />
      <path d={postCrack} {...thin} strokeWidth={1.7} />
      <path d={postTicks.join('')} {...thin} strokeWidth={1.3} />
      {shadowStrips.map((s, i) => (
        <polygon key={i} points={s.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')} fill={SHADE} />
      ))}
      <DotLayer d={postDots} />
      <path d={frontGrass} {...thin} strokeWidth={2.2} />
      {/* planks, bottom first so each one tucks under the plank above */}
      {planks
        .map((p, i) => {
          const s = p.dir === 'right' ? 1 : -1;
          const r = mulberry32(seed * 1301 + i * 173 + 7);
          const y = top + i * pitch, mid = y + h / 2;
          const L = compact ? (p.small ? 380 : 520) : p.small ? 460 : 640;
          const tail = compact ? 120 : 140;
          const tip = compact ? 62 : 70;
          const xt = px - s * tail;
          const xh = px + s * (L - tail);
          const xb = xh - s * tip;
          const kind = i % 3;
          let pts: Pt[] = [[xt, y], [xb, y], [xh, mid], [xb, y + h], [xt, y + h]];
          if (kind === 0) pts.push([xt - s * 30, mid]);
          else if (kind === 1) pts.push([xt + s * 24, mid]);
          else pts.push([xt - s * 3, y + h * 0.74], [xt + s * 9, y + h * 0.56], [xt + s * 3, y + h * 0.4], [xt - s * 5, y + h * 0.2]);
          pts = jitter(chip(pts, r, 0.5, 7), r, 48, 1.5);
          const tilt = TILT[i % TILT.length];
          const dots: Dots = { s: [], l: [] };
          rim(pts, r, 7.5, (mx, _my, nx, ny) => (ny > 0.5 ? 0.35 + (Math.abs(mx - px) < 180 ? 0.9 : 0) : ny < -0.5 ? 1.4 : nx * s < 0 ? 0.5 : 1.5), dots);
          specks(pts, r, Math.round(L / 13), (_x, yy) => Math.abs(yy - mid) < 24, dots);
          const lo = Math.min(xt, xb), hi = Math.max(xt, xb);
          const lines = [
            grain(lo + 14, hi - 12, y + 13, 2.2, r),
            grain(lo + rng(r, 40, 120), hi - rng(r, 30, 90), y + 25, 1.8, r),
            grain(lo + rng(r, 30, 80), hi - rng(r, 20, 60), y + h - 25, 1.8, r),
            grain(lo + 16, hi - 10, y + h - 12, 2.4, r),
            `M${f1(xb + s * 6)} ${f1(mid - 15)}L${f1(xh - s * 18)} ${f1(mid - 4)}`,
            `M${f1(xb + s * 6)} ${f1(mid + 15)}L${f1(xh - s * 18)} ${f1(mid + 4)}`,
          ];
          const cracks: string[] = [];
          if (kind === 0) cracks.push(crack(xt - s * 28, mid + 1, s, 0, rng(r, 40, 70), r));
          else if (kind === 1) cracks.push(crack(xt + s * 24, mid - 2, s, 0, rng(r, 34, 60), r));
          else cracks.push(crack(xt + s * 8, y + h * 0.56, s, 0, rng(r, 44, 80), r));
          if (r() < 0.6) cracks.push(crack(xh - s * 2, mid + rng(r, -3, 3), -s, 0, rng(r, 24, 44), r));
          const ticks: string[] = [];
          const tn = 4 + Math.floor(r() * 4);
          for (let k = 0; k < tn; k++) {
            const tx = rng(r, lo + 20, hi - 20);
            ticks.push(`M${f1(tx)} ${f1(y + h - rng(r, 3, 9))}l${f1(rng(r, -1.5, 1.5))} ${f1(-rng(r, 4, 8))}`);
          }
          const knot = r() < 0.75 ? { cx: r() < 0.5 ? xb - s * rng(r, 30, 90) : xt + s * rng(r, 40, 80), cy: y + h - 22, rx: rng(r, 9, 12), ry: rng(r, 5.5, 7), rot: rng(r, -8, 8) } : null;
          const screws = [screw('c', px, mid, 8.5, r, dots, true), ...(p.small ? [] : [screw('h', xb - s * 22, y + 20 + rng(r, -2, 2), 5, r, dots, false)])];
          const thick = pts.map(([a, b]): Pt => [f1(a + 6), f1(b + 10)]);
          const inner0 = px + s * 44, inner1 = xb - s * 8;
          const cx = (inner0 + inner1) / 2;
          const avail = Math.abs(inner1 - inner0) - 12;
          const fs0 = p.small ? 44 : 54;
          const est = p.label.length * fs0 * 0.34;
          const fs = est > avail ? f1((fs0 * avail) / est) : fs0;
          return (
            <a key={`${i}-${p.label}`} className="sg-plank" href={p.href} aria-label={p.label} onClick={() => onPlank?.(p)}>
              {/* the hover lift in CSS replaces the outer transform, so the tilt lives one level down */}
              <g transform="translate(0 0)">
                <g transform={`rotate(${tilt} ${px} ${mid})`}>
                  <Rough kind="poly" points={thick} seed={seed + 40 + i} opts={face(2.4)} />
                  <Rough kind="poly" points={pts} seed={seed + 20 + i} opts={outline(3)} />
                  {lines.map((d, k) => (
                    <path key={k} d={d} {...thin} strokeWidth={1.3} />
                  ))}
                  {knot && <Knot {...knot} />}
                  {cracks.map((d, k) => (
                    <path key={k} d={d} {...thin} strokeWidth={1.7} />
                  ))}
                  <path d={ticks.join('')} {...thin} strokeWidth={1.3} />
                  <DotLayer d={dots} />
                  {screws}
                  <text x={f1(cx)} y={f1(mid + fs * 0.35)} textAnchor="middle" className={`sg-label${p.small ? ' sg-label-small' : ''}`} style={fs !== fs0 ? { fontSize: fs } : undefined}>
                    {p.label}
                  </text>
                </g>
              </g>
            </a>
          );
        })
        .reverse()}
      {/* title board: the topmost thing; the post ends behind it */}
      <g transform={`rotate(-2.5 ${px} ${boardY + boardH / 2})`}>
        <Rough kind="poly" points={boardPts.map(([a, b]): Pt => [f1(a + 6), f1(b + 10)])} seed={seed + 11} opts={face(2.4)} />
        <Rough kind="poly" points={boardPts} seed={seed + 10} opts={outline(3.2)} />
        {boardGrain.map((d, i) => (
          <path key={i} d={d} {...thin} strokeWidth={1.3} />
        ))}
        <Knot cx={bx + 84} cy={boardY + boardH - 24} rx={9} ry={6} rot={-6} />
        <path d={boardCrack} {...thin} strokeWidth={1.7} />
        <path d={boardCrack2} {...thin} strokeWidth={1.5} />
        <DotLayer d={boardDots} />
        {boardScrews}
        <text x={px} y={boardY + boardH / 2 + 22} textAnchor="middle" className="sg-title">
          {title}
        </text>
      </g>
    </svg>
  );
}
