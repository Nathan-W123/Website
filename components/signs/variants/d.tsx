'use client';

import { useEffect, useState } from 'react';
import { Rough } from '@/components/sketch/rough';
import type { Plank } from '../signpost';

/**
 * Variant d: chunky storybook signpost. Thin ink outlines, flat grey cel
 * shading (a grey underside on every board, a mid-grey shadow band on the
 * post under each plank, a dark offset drop shadow) and a light sprinkle of
 * seeded stipple. Planks are bowed, chipped, worn at the corners and stacked
 * tight on the post at alternating angles up to ~12 degrees. The title board
 * is the topmost thing; the post ends behind it.
 */

const INK = '#111';
const PAPER = '#fff';
const LIGHT = '#d9d9d9';
const MID = '#9a9a9a';
const DARK = '#3d3d3d';

type Pt = [number, number];
type Rng = () => number;

/** Integer PRNG (mulberry32) so server and client draw identical dots. */
function mulberry32(a: number): Rng {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (n: number) => Math.round(n * 10) / 10;
const rad = (deg: number) => (deg * Math.PI) / 180;

const lineOpts = (w: number, rough = 0.9) => ({
  stroke: INK,
  strokeWidth: w,
  roughness: rough,
  bowing: 0.5,
  fill: 'none',
  disableMultiStroke: true,
});
const faceOpts = (w: number, fill: string, rough = 0.9) => ({
  stroke: INK,
  strokeWidth: w,
  roughness: rough,
  bowing: 0.6,
  fill,
  fillStyle: 'solid' as const,
  disableMultiStroke: true,
});
const flatOpts = (fill: string, rough = 0.6) => ({
  stroke: 'none',
  fill,
  fillStyle: 'solid' as const,
  roughness: rough,
  disableMultiStroke: true,
});

/** Seeded dots inside a box; `bias` > 0 crowds them toward the bottom edge. */
function stipple(
  rng: Rng,
  n: number,
  x: number,
  y: number,
  w: number,
  h: number,
  bias = 0,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const u = rng();
    const v = bias > 0 ? Math.pow(rng(), 1 / (1 + bias)) : rng();
    out.push([r1(x + u * w), r1(y + v * h)]);
  }
  return out;
}

function Dots({ pts, r = 1.5, rng }: { pts: Pt[]; r?: number; rng: Rng }) {
  return (
    <g fill={INK}>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={r1(r * (0.7 + rng() * 0.6))} />
      ))}
    </g>
  );
}

/** A walk along one edge from (x1,y) to (x2,y) with a bow, wobble and the odd chip. `into` is +1 when the plank is below the edge. */
function edge(
  rng: Rng,
  x1: number,
  x2: number,
  y: number,
  into: number,
  bowAt: (x: number) => number,
  step = 34,
): Pt[] {
  const out: Pt[] = [];
  const n = Math.max(2, Math.round(Math.abs(x2 - x1) / step));
  for (let k = 0; k <= n; k++) {
    const x = x1 + ((x2 - x1) * k) / n;
    const yy = y + bowAt(x) + (rng() - 0.5) * 2;
    if (k > 0 && k < n && rng() < 0.28) {
      const d = 3 + rng() * 4;
      const wdt = (x2 > x1 ? 1 : -1) * (5 + rng() * 5);
      out.push(
        [r1(x - wdt * 0.5), r1(yy)],
        [r1(x), r1(yy + into * d)],
        [r1(x + wdt * 0.5), r1(yy - into * 0.6)],
      );
    } else out.push([r1(x), r1(yy)]);
  }
  return out;
}

type Tail = 'notch' | 'point' | 'flat';

/** Arrow plank outline in canonical space (tail at a=0, tip at a=L), mapped to x = xt + s*a. */
function plankShape(
  rng: Rng,
  s: 1 | -1,
  xt: number,
  L: number,
  y: number,
  h: number,
  tip: number,
  tail: Tail,
  bow: number,
): Pt[] {
  const mid = y + h / 2;
  const c = 7;
  const bowAt = (a: number) => -bow * Math.sin((Math.PI * a) / L);
  const X = (a: number) => xt + s * a;
  const a0 = tail === 'point' ? 24 : 0;
  const pts: Pt[] = [];
  // top edge
  pts.push(
    ...edge(rng, X(a0 + c), X(L - tip - c), y, 1, (x) => bowAt(s * (x - xt))),
  );
  // head
  const hb = L - tip;
  pts.push(
    [r1(X(hb)), r1(y + c + bowAt(hb))],
    [r1(X(L - 3)), r1(mid - 3 + bowAt(L))],
    [r1(X(L)), r1(mid + bowAt(L))],
    [r1(X(L - 3)), r1(mid + 3 + bowAt(L))],
    [r1(X(hb)), r1(y + h - c + bowAt(hb))],
  );
  // bottom edge
  pts.push(
    ...edge(rng, X(L - tip - c), X(a0 + c), y + h, -1, (x) =>
      bowAt(s * (x - xt)),
    ),
  );
  // tail
  if (tail === 'point')
    pts.push(
      [r1(X(a0)), r1(y + h - 2 + bowAt(a0))],
      [r1(X(0)), r1(mid + bowAt(0))],
      [r1(X(a0)), r1(y + 2 + bowAt(a0))],
    );
  else if (tail === 'notch')
    pts.push(
      [r1(X(0)), r1(y + h - c + bowAt(0))],
      [r1(X(24)), r1(mid + bowAt(24))],
      [r1(X(0)), r1(y + c + bowAt(0))],
    );
  else
    pts.push(
      [r1(X(0)), r1(y + h - c + bowAt(0))],
      [r1(X(-2)), r1(mid + 4 + bowAt(0))],
      [r1(X(0)), r1(y + c + bowAt(0))],
    );
  return pts;
}

/** Rounded worn rectangle (the title board). */
function boardShape(
  rng: Rng,
  x: number,
  y: number,
  w: number,
  h: number,
  bow: number,
): Pt[] {
  const c = 16;
  const bowAt = (px: number) => -bow * Math.sin((Math.PI * (px - x)) / w);
  const pts: Pt[] = [];
  pts.push([r1(x + c * 0.3), r1(y + c * 0.3)]);
  pts.push(...edge(rng, x + c, x + w - c, y, 1, bowAt, 40));
  pts.push(
    [r1(x + w - c * 0.3), r1(y + c * 0.3)],
    [r1(x + w), r1(y + c)],
    [r1(x + w + 2), r1(y + h * 0.55)],
    [r1(x + w), r1(y + h - c)],
    [r1(x + w - c * 0.3), r1(y + h - c * 0.3)],
  );
  pts.push(...edge(rng, x + w - c, x + c, y + h, -1, bowAt, 40));
  pts.push(
    [r1(x + c * 0.3), r1(y + h - c * 0.3)],
    [r1(x), r1(y + h - c)],
    [r1(x - 2), r1(y + h * 0.45)],
    [r1(x), r1(y + c)],
  );
  return pts;
}

const shift = (pts: Pt[], dx: number, dy: number): Pt[] =>
  pts.map(([a, b]) => [r1(a + dx), r1(b + dy)]);

/** Wavy grain line through a few points. */
function grainPath(
  rng: Rng,
  x1: number,
  x2: number,
  y: number,
  amp: number,
  bowAt: (x: number) => number,
  segs = 3,
) {
  let d = `M ${r1(x1)} ${r1(y + bowAt(x1))}`;
  for (let k = 0; k < segs; k++) {
    const xa = x1 + ((x2 - x1) * k) / segs;
    const xb = x1 + ((x2 - x1) * (k + 1)) / segs;
    const sgn = k % 2 === 0 ? 1 : -1;
    const w = amp * (0.6 + rng() * 0.8);
    d += ` C ${r1(xa + (xb - xa) / 3)} ${r1(y + bowAt(xa) - sgn * w)}, ${r1(xb - (xb - xa) / 3)} ${r1(y + bowAt(xb) + sgn * w)}, ${r1(xb)} ${r1(y + bowAt(xb) + (rng() - 0.5) * 2)}`;
  }
  return d;
}

/** Split running in from a plank end. */
function crack(x: number, y: number, s: number, len: number, rng: Rng) {
  const a = len * (0.3 + rng() * 0.2),
    b = len * (0.6 + rng() * 0.2);
  const main = `M ${r1(x)} ${r1(y)} L ${r1(x + s * a)} ${r1(y - 2 - rng() * 3)} L ${r1(x + s * b)} ${r1(y + 1 + rng() * 3)} L ${r1(x + s * len)} ${r1(y - 1)}`;
  const branch = `M ${r1(x + s * a)} ${r1(y - 2)} L ${r1(x + s * (a + 12))} ${r1(y + 6 + rng() * 4)}`;
  return (
    <g
      fill="none"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={main} />
      <path d={branch} />
    </g>
  );
}

function Nail({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={LIGHT}
        stroke={INK}
        strokeWidth={1.8}
      />
      <circle
        cx={r1(cx + r * 0.3)}
        cy={r1(cy + r * 0.3)}
        r={r1(r * 0.36)}
        fill={INK}
      />
    </g>
  );
}

function Screw({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  const k = r * 0.55;
  return (
    <g stroke={INK} strokeLinecap="round">
      <circle cx={cx} cy={cy} r={r} fill={LIGHT} strokeWidth={1.8} />
      <line
        x1={r1(cx - k)}
        y1={r1(cy - k * 0.6)}
        x2={r1(cx + k)}
        y2={r1(cy + k * 0.6)}
        strokeWidth={1.6}
      />
      <line
        x1={r1(cx + k * 0.6)}
        y1={r1(cy - k)}
        x2={r1(cx - k * 0.6)}
        y2={r1(cy + k)}
        strokeWidth={1.6}
      />
    </g>
  );
}

function Leaf({
  x,
  y,
  a,
  seed,
  flip = false,
}: {
  x: number;
  y: number;
  a: number;
  seed: number;
  flip?: boolean;
}) {
  const d = flip
    ? 'M 0 0 C 4 -12, 16 -14, 24 -4 C 16 6, 6 6, 0 0 Z'
    : 'M 0 0 C 4 12, 16 14, 24 4 C 16 -6, 6 -6, 0 0 Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(1.35)`}>
      <Rough kind="path" d={d} seed={seed} opts={faceOpts(1.5, LIGHT, 0.6)} />
      <path
        d={flip ? 'M 2 -1 Q 12 -9 22 -5' : 'M 2 1 Q 12 9 22 5'}
        fill="none"
        stroke={INK}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </g>
  );
}

const TAILS: Tail[] = [
  'notch',
  'point',
  'flat',
  'point',
  'notch',
  'flat',
  'point',
];
const TILTS = [9, 7, 12, 6, 10, 8, 11];

export function Signpost({
  title,
  planks,
  seed = 1,
  onPlank,
}: {
  title: string;
  planks: Plank[];
  seed?: number;
  onPlank?: (p: Plank) => void;
}) {
  // phones get shorter planks so the whole post scales up to fill the width
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const fit = () => setCompact(window.innerWidth < 720);
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const W = compact ? 900 : 1100;
  const postX = W / 2;
  const plankH = 92;
  const pitch = 118;
  const top = 300;
  const n = planks.length;
  const H = top + n * pitch + 300;
  const baseY = H - 84;
  const postTop = 214;
  const halfTop = 34,
    halfBot = 42;
  const postL = (y: number) =>
    postX - halfTop - ((halfBot - halfTop) * (y - postTop)) / (baseY - postTop);
  const postR = (y: number) =>
    postX + halfTop + ((halfBot - halfTop) * (y - postTop)) / (baseY - postTop);
  const knotY = top + n * pitch + 52;

  const rngPost = mulberry32(seed * 7919 + 11);
  const boardW = compact ? 540 : 600,
    boardH = 116,
    boardY = 150;
  const board = boardShape(
    rngPost,
    postX - boardW / 2,
    boardY,
    boardW,
    boardH,
    3,
  );
  const boardCy = boardY + boardH / 2;

  // plank geometry (unrotated), plus the rotation of each
  const geo = planks.map((p, i) => {
    const rng = mulberry32(seed * 1000 + i * 17 + 3);
    const s: 1 | -1 = p.dir === 'right' ? 1 : -1;
    const L = compact ? (p.small ? 360 : 500) : p.small ? 420 : 600;
    const t = compact ? 82 : 92;
    const tip = compact ? 62 : 70;
    const y = top + i * pitch;
    const mid = y + plankH / 2;
    const xt = postX - s * t;
    const tail = TAILS[i % TAILS.length];
    const rot = r1(
      (i % 2 === 0 ? -1 : 1) * (TILTS[i % TILTS.length] + (rng() - 0.5) * 2),
    );
    const pts = plankShape(rng, s, xt, L, y, plankH, tip, tail, 4 + rng() * 2);
    return { p, i, rng, s, L, t, tip, y, mid, xt, tail, rot, pts };
  });

  // mid-grey shadow bands on the post under each plank, following its angle
  const bands = geo.map((g) => {
    const th = rad(g.rot),
      sn = Math.sin(th),
      cs = Math.cos(th);
    const xl = postL(g.mid) - 2,
      xr = postR(g.mid) + 2;
    const yl = g.mid + (xl - postX) * sn + (plankH / 2) * cs;
    const yr = g.mid + (xr - postX) * sn + (plankH / 2) * cs;
    return [
      [r1(xl), r1(yl - 4)],
      [r1(xr), r1(yr - 4)],
      [r1(xr), r1(yr + 44)],
      [r1(xl), r1(yl + 44)],
    ] as Pt[];
  });

  const sideDots = stipple(
    rngPost,
    Math.round((baseY - postTop) / 9),
    postX + 8,
    postTop + 60,
    24,
    baseY - postTop - 80,
  );
  const groundDots = stipple(rngPost, 46, postX - 120, baseY - 6, 300, 30, 1);
  const grassL = `M ${postX - 175} ${baseY + 6} l 9 -24 l 7 18 l 10 -34 l 8 30 l 9 -22 l 8 22 l 10 -30 l 9 30 l 8 -16 l 8 16 l 12 -26 l 9 26 l 10 -18 l 9 18 l 8 -12 l 10 12`;
  const grassR = `M ${postX + 18} ${baseY + 6} l 9 -20 l 8 20 l 11 -36 l 9 36 l 10 -24 l 8 24 l 9 -30 l 9 30 l 8 -14 l 8 14 l 12 -28 l 10 28 l 9 -16 l 8 16 l 10 -22 l 8 22 l 8 -10 l 8 10`;

  return (
    <svg
      className="sg-post"
      viewBox={`0 0 ${W} ${H}`}
      aria-label={`${title} signpost`}
    >
      {/* ground: flat grey pool of shadow with stipple, pebbles */}
      <Rough
        kind="ellipse"
        cx={postX + 16}
        cy={baseY + 12}
        w={360}
        h={48}
        seed={seed + 900}
        opts={flatOpts(LIGHT)}
      />
      <Dots pts={groundDots} r={1.4} rng={rngPost} />
      <Rough
        kind="ellipse"
        cx={postX + 150}
        cy={baseY + 4}
        w={26}
        h={16}
        seed={seed + 901}
        opts={faceOpts(2, PAPER, 0.8)}
      />
      <Rough
        kind="ellipse"
        cx={postX + 176}
        cy={baseY + 10}
        w={16}
        h={11}
        seed={seed + 902}
        opts={faceOpts(2, LIGHT, 0.8)}
      />
      <Rough
        kind="ellipse"
        cx={postX - 128}
        cy={baseY + 8}
        w={22}
        h={14}
        seed={seed + 903}
        opts={faceOpts(2, PAPER, 0.8)}
      />

      {/* post: white face, flat light-grey right side, grain, a big knot */}
      <Rough
        kind="poly"
        points={[
          [postX - halfTop, postTop],
          [postX + halfTop, postTop],
          [postX + halfBot, baseY],
          [postX - halfBot, baseY],
        ]}
        seed={seed + 1}
        opts={faceOpts(3, PAPER, 1)}
      />
      <polygon
        points={`${r1(postX + 11)},${postTop} ${postX + halfTop},${postTop} ${postX + halfBot},${baseY} ${r1(postX + 15)},${baseY}`}
        fill={LIGHT}
      />
      <Dots pts={sideDots} r={1.3} rng={rngPost} />
      {/* shadow band under the title board */}
      <polygon
        points={`${r1(postL(boardCy + 60))},${boardCy + 52} ${r1(postR(boardCy + 60))},${boardCy + 46} ${r1(postR(boardCy + 60))},${boardCy + 84} ${r1(postL(boardCy + 60))},${boardCy + 90}`}
        fill={MID}
      />
      {bands.map((b, i) => (
        <polygon
          key={i}
          points={b.map((q) => q.join(',')).join(' ')}
          fill={MID}
        />
      ))}
      {/* grain: one full line, one that breaks around the knot */}
      <Rough
        kind="path"
        d={`M ${postX - 16} ${postTop + 40} C ${postX - 20} ${postTop + 200}, ${postX - 10} ${postTop + 320}, ${postX - 17} ${knotY - 60} S ${postX - 24} ${baseY - 120}, ${postX - 19} ${baseY - 12}`}
        seed={seed + 2}
        opts={lineOpts(1.5, 0.7)}
      />
      <Rough
        kind="path"
        d={`M ${postX + 4} ${postTop + 60} C ${postX + 1} ${postTop + 180}, ${postX + 8} ${postTop + 260}, ${postX + 3} ${knotY - 34}`}
        seed={seed + 3}
        opts={lineOpts(1.4, 0.7)}
      />
      <Rough
        kind="path"
        d={`M ${postX + 5} ${knotY + 36} C ${postX + 2} ${knotY + 90}, ${postX + 9} ${baseY - 60}, ${postX + 4} ${baseY - 10}`}
        seed={seed + 4}
        opts={lineOpts(1.4, 0.7)}
      />
      {/* grain bending around the knot */}
      <Rough
        kind="path"
        d={`M ${postX - 10} ${knotY - 80} C ${postX - 20} ${knotY - 34}, ${postX - 21} ${knotY + 34}, ${postX - 11} ${knotY + 80}`}
        seed={seed + 5}
        opts={lineOpts(1.3, 0.6)}
      />
      <Rough
        kind="path"
        d={`M ${postX + 24} ${knotY - 76} C ${postX + 34} ${knotY - 30}, ${postX + 34} ${knotY + 30}, ${postX + 25} ${knotY + 76}`}
        seed={seed + 6}
        opts={lineOpts(1.3, 0.6)}
      />
      <Rough
        kind="ellipse"
        cx={postX + 7}
        cy={knotY}
        w={40}
        h={60}
        seed={seed + 7}
        opts={faceOpts(2, LIGHT, 0.9)}
      />
      <Rough
        kind="ellipse"
        cx={postX + 7}
        cy={knotY}
        w={25}
        h={40}
        seed={seed + 8}
        opts={lineOpts(1.4, 0.8)}
      />
      <Rough
        kind="ellipse"
        cx={postX + 9}
        cy={knotY + 1}
        w={14}
        h={24}
        seed={seed + 9}
        opts={faceOpts(1.4, MID, 0.8)}
      />
      <ellipse cx={postX + 10} cy={knotY + 3} rx={2.6} ry={4.5} fill={INK} />
      <path
        d={`M ${postX + 7} ${knotY + 30} l -2 14 l 3 10`}
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* weathering on the post: checks and a split at the foot */}
      <g fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round">
        <path d={`M ${postX - 24} ${postTop + 120} l 3 14`} />
        <path d={`M ${postX + 20} ${postTop + 170} l -2 16`} />
        <path d={`M ${postX - 6} ${knotY + 110} l 2 18`} />
        <path d={`M ${postX + 24} ${knotY - 120} l 2 12`} />
        <path
          d={`M ${postX - 4} ${baseY} l 3 -28 l -5 -22 l 4 -18`}
          strokeWidth={1.7}
        />
        <path d={`M ${postX - 4} ${baseY - 28} l 6 -12`} />
      </g>

      {/* vine creeping up the post from the grass */}
      <Rough
        kind="path"
        d={`M ${postX - 46} ${baseY + 2} C ${postX - 58} ${baseY - 34}, ${postX - 30} ${baseY - 56}, ${postX - 42} ${baseY - 88} S ${postX - 28} ${baseY - 128}, ${postX - 40} ${baseY - 140}`}
        seed={seed + 10}
        opts={lineOpts(2, 0.7)}
      />
      <Leaf x={postX - 52} y={baseY - 30} a={-150} seed={seed + 11} />
      <Leaf x={postX - 36} y={baseY - 62} a={-20} seed={seed + 12} flip />
      <Leaf x={postX - 44} y={baseY - 100} a={-160} seed={seed + 13} />
      <Leaf x={postX - 38} y={baseY - 128} a={-50} seed={seed + 14} flip />
      <path
        d={`M ${postX - 40} ${baseY - 140} c -6 -8 2 -14 6 -8 c 3 5 -4 8 -5 3`}
        fill="none"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinecap="round"
      />

      {/* grass tufts on both sides of the foot */}
      <Rough
        kind="path"
        d={grassL}
        seed={seed + 15}
        opts={faceOpts(2.4, PAPER, 0.8)}
      />
      <Rough
        kind="path"
        d={grassR}
        seed={seed + 16}
        opts={faceOpts(2.4, PAPER, 0.8)}
      />
      <g fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round">
        <path
          d={`M ${postX - 236} ${baseY + 4} c -2 -10 -8 -16 -12 -20 M ${postX - 236} ${baseY + 4} c 1 -12 0 -20 4 -28 M ${postX - 236} ${baseY + 4} c 4 -8 10 -12 16 -14`}
        />
        <path
          d={`M ${postX + 226} ${baseY + 6} c -3 -9 -8 -14 -14 -18 M ${postX + 226} ${baseY + 6} c 0 -12 2 -18 6 -26 M ${postX + 226} ${baseY + 6} c 5 -8 11 -10 18 -12`}
        />
        <path
          d={`M ${postX + 262} ${baseY} c -2 -7 -6 -10 -10 -12 M ${postX + 262} ${baseY} c 2 -8 4 -12 8 -16`}
        />
        <path
          d={`M ${postX - 92} ${baseY + 14} c -2 -8 -6 -12 -10 -14 M ${postX - 92} ${baseY + 14} c 2 -9 3 -14 7 -18`}
        />
      </g>
      {/* a small bird on the ground by the pebble */}
      <g transform={`translate(${postX - 196} ${baseY - 6})`}>
        <Rough
          kind="ellipse"
          cx={0}
          cy={0}
          w={30}
          h={20}
          seed={seed + 17}
          opts={faceOpts(2, PAPER, 0.8)}
        />
        <Rough
          kind="poly"
          points={[
            [-12, -3],
            [-30, -10],
            [-26, 0],
            [-13, 3],
          ]}
          seed={seed + 18}
          opts={faceOpts(2, PAPER, 0.8)}
        />
        <Rough
          kind="circle"
          cx={14}
          cy={-9}
          d={16}
          seed={seed + 19}
          opts={faceOpts(2, PAPER, 0.8)}
        />
        <polygon points="21,-9 31,-6 21,-4" fill={INK} />
        <circle cx={16} cy={-11} r={1.8} fill={INK} />
        <path
          d="M -8 -2 C -2 -8, 8 -8, 10 -1"
          fill="none"
          stroke={INK}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <path
          d="M -4 9 l -1 8 M -4 17 l -4 3 M -4 17 l 4 2 M 5 9 l 0 8 M 5 17 l -4 3 M 5 17 l 4 2"
          fill="none"
          stroke={INK}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </g>

      {/* title board: drop shadow, grey underside, worn white face */}
      <g transform={`rotate(-3 ${postX} ${boardCy})`}>
        <Rough
          kind="poly"
          points={shift(board, 12, 16)}
          seed={seed + 20}
          opts={flatOpts(DARK)}
        />
        <Rough
          kind="poly"
          points={shift(board, 0, 12)}
          seed={seed + 21}
          opts={faceOpts(2.5, MID, 0.8)}
        />
        <Rough
          kind="poly"
          points={board}
          seed={seed + 22}
          opts={faceOpts(3, PAPER, 1)}
        />
        <Rough
          kind="path"
          d={grainPath(
            rngPost,
            postX - boardW / 2 + 30,
            postX + boardW / 2 - 40,
            boardY + 14,
            3,
            () => 0,
            4,
          )}
          seed={seed + 23}
          opts={lineOpts(1.4, 0.6)}
        />
        <Rough
          kind="path"
          d={grainPath(
            rngPost,
            postX - boardW / 2 + 44,
            postX + boardW / 2 - 28,
            boardY + boardH - 14,
            3,
            () => 0,
            4,
          )}
          seed={seed + 24}
          opts={lineOpts(1.4, 0.6)}
        />
        {crack(postX - boardW / 2, boardY + 44, 1, 44, rngPost)}
        {crack(postX + boardW / 2, boardY + 70, -1, 36, rngPost)}
        <g fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round">
          <path d={`M ${postX - boardW / 2 + 90} ${boardY + 22} l 14 1`} />
          <path
            d={`M ${postX + boardW / 2 - 110} ${boardY + boardH - 22} l 16 -1`}
          />
          <path d={`M ${postX + boardW / 2 - 70} ${boardY + 20} l 12 2`} />
        </g>
        <Dots
          pts={stipple(
            rngPost,
            34,
            postX - boardW / 2 + 16,
            boardY + boardH - 20,
            boardW - 32,
            16,
            1.5,
          )}
          r={1.3}
          rng={rngPost}
        />
        <Dots
          pts={stipple(
            rngPost,
            10,
            postX - boardW / 2 + 10,
            boardY + 12,
            40,
            boardH - 30,
          )}
          r={1.2}
          rng={rngPost}
        />
        <Screw cx={postX - boardW / 2 + 30} cy={boardCy} />
        <Screw cx={postX + boardW / 2 - 30} cy={boardCy} />
        <text
          x={postX}
          y={boardCy + 22}
          textAnchor="middle"
          className="sg-title"
        >
          {title}
        </text>
      </g>

      {/* planks, each at its own angle, stacked tight on the post */}
      {geo.map((g) => {
        const { p, i, rng, s, L, tip, y, mid, xt, tail, rot, pts } = g;
        const X = (a: number) => xt + s * a;
        const bowAt = (x: number) =>
          -5 * Math.sin((Math.PI * s * (x - xt)) / L);
        const a0 = tail === 'point' ? 26 : 8;
        const bodyEnd = L - tip - 10;
        const gx1 = Math.min(X(a0 + 6), X(bodyEnd)),
          gx2 = Math.max(X(a0 + 6), X(bodyEnd));
        const cx = (postX + s * (halfTop + 6) + X(L - tip)) / 2;
        const long = p.label.length > 12;
        // stipple: bottom band across the face plus a sprinkle at the tail end
        const bandDots = stipple(
          rng,
          Math.round(L / 14),
          gx1,
          y + plankH - 18,
          gx2 - gx1,
          15,
          1.6,
        );
        const tailDots = stipple(
          rng,
          12,
          Math.min(X(a0), X(a0 + 44)),
          y + 10,
          44,
          plankH - 20,
        );
        const checks = [0, 1, 2].map((k) => {
          const a = a0 + 10 + rng() * 40 + (k === 2 ? L - tip - 70 - a0 : 0);
          const yy = y + 12 + rng() * (plankH - 24);
          return `M ${r1(X(a))} ${r1(yy + bowAt(X(a)))} l ${r1(s * (8 + rng() * 10))} ${r1((rng() - 0.5) * 3)}`;
        });
        const nailY1 = y + 17,
          nailY2 = y + plankH - 17;
        return (
          <a
            key={p.label}
            className="sg-plank"
            href={p.href}
            aria-label={p.label}
            onClick={() => onPlank?.(p)}
          >
            {/* the outer g is the CSS hover-lift target; the tilt lives one level down so the lift's transform never replaces it */}
            <g>
              <g transform={`rotate(${rot} ${postX} ${mid})`}>
                <Rough
                  kind="poly"
                  points={shift(pts, 11, 15)}
                  seed={seed + 100 + i * 10}
                  opts={flatOpts(DARK)}
                />
                <Rough
                  kind="poly"
                  points={shift(pts, 0, 11)}
                  seed={seed + 101 + i * 10}
                  opts={faceOpts(2.5, MID, 0.8)}
                />
                <Rough
                  kind="poly"
                  points={pts}
                  seed={seed + 102 + i * 10}
                  opts={faceOpts(3, PAPER, 1)}
                />
                <Rough
                  kind="path"
                  d={grainPath(rng, gx1, gx2, y + 11, 2.5, bowAt, 4)}
                  seed={seed + 103 + i * 10}
                  opts={lineOpts(1.4, 0.6)}
                />
                <Rough
                  kind="path"
                  d={grainPath(
                    rng,
                    gx1 + 10,
                    gx2 - 6,
                    y + plankH - 11,
                    2.5,
                    bowAt,
                    4,
                  )}
                  seed={seed + 104 + i * 10}
                  opts={lineOpts(1.4, 0.6)}
                />
                <g
                  fill="none"
                  stroke={INK}
                  strokeWidth={1.7}
                  strokeLinecap="round"
                >
                  {checks.map((d, k) => (
                    <path key={k} d={d} />
                  ))}
                </g>
                {crack(
                  X(tail === 'point' ? 4 : 0),
                  mid + 4 + (i % 2 ? -12 : 10),
                  s,
                  34 + rng() * 14,
                  rng,
                )}
                {i % 3 === 1 &&
                  crack(X(L - 2), mid - 2, -s, 26 + rng() * 10, rng)}
                <Dots pts={bandDots} r={1.3} rng={rng} />
                <Dots pts={tailDots} r={1.2} rng={rng} />
                <Nail cx={postX - 13} cy={nailY1} />
                <Nail cx={postX + 13} cy={nailY2} />
                <text
                  x={r1(cx)}
                  y={mid + 18}
                  textAnchor="middle"
                  className={`sg-label${p.small ? ' sg-label-small' : ''}${long ? ' sg-label-long' : ''}`}
                  style={
                    long ? { fontSize: 42, letterSpacing: '0.02em' } : undefined
                  }
                >
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
