'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Rough } from '@/components/sketch/rough';
export type Plank = { label: string; dir: 'left' | 'right'; href: string; small?: boolean };

/**
 * Pen-and-ink trail signpost. Thin confident outlines (a little rough.js
 * wobble), and the shading is stippled: dots from a seeded integer PRNG so the
 * server and client draw the same picture. Two flat greys give it cartoon
 * punch: the sawn thickness faces (light grey under sparse end-grain dots) and
 * the ground pool with its cast-shadow wedge; contact shadows on the post are
 * solid ink. Planks stack tight on the post at alternating angles, tails
 * running well past it, with chipped edges, a slight banana bow, wood grain,
 * concentric knots, end checks, bold Phillips screws and weather marks. The
 * title board is the topmost thing; the post starts hidden behind it.
 */

const INK = '#111';
const FACE = '#d4d4d4'; // sawn thickness faces
const POOL = '#e6e6e6'; // ground shadow pool
const POOL_EDGE = '#c9c9c9';
const WEDGE = '#c2c2c2'; // cast shadow of the post on the ground
const LINE = 3; // main outlines
const EDGE = 1.8; // thickness faces
const FINE = 1.3; // grain and weather marks
const EX = 4,
  EY = 10; // plank thickness, light from the upper left
const TILE = 36; // stipple pattern tile size

type Pt = [number, number];
type Rand = () => number;

/** mulberry32: integer state, so it hydrates identically. */
function mulberry32(seed: number): Rand {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (v: number) => Math.round(v * 10) / 10;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pts2s = (pts: Pt[]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

function inside(poly: Pt[], x: number, y: number) {
  let inn = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inn = !inn;
  }
  return inn;
}

/** Rotates (x, y) by `deg` about (cx, cy). */
function rot(x: number, y: number, deg: number, cx: number, cy: number): Pt {
  const a = (deg * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [r1(cx + (x - cx) * c - (y - cy) * s), r1(cy + (x - cx) * s + (y - cy) * c)];
}

/** Tenths of a unit as a compact decimal string: 23 -> "2.3", -4 -> "-.4", 30 -> "3". */
function tenths(t: number): string {
  const v = (t / 10).toFixed(1);
  return v.endsWith('.0') ? v.slice(0, -2) : v.replace(/^(-?)0\./, '$1.');
}

/** Builds dot path data from short relative moves (each dot is a 0.1-long round-capped dash). */
class Dots {
  d = '';
  private x = 0;
  private y = 0;
  add(x: number, y: number) {
    const X = Math.round(x * 10),
      Y = Math.round(y * 10);
    const dy = tenths(Y - this.y);
    this.d += `m${tenths(X - this.x)}${dy.startsWith('-') ? '' : ' '}${dy}h.1`;
    this.x = X + 1;
    this.y = Y;
  }
}

/** Stipple dots on a jittered grid inside `poly`, kept with probability density(x, y). Returns path data for small and big dots. */
function stipple(
  seed: number,
  poly: Pt[],
  spacing: number,
  density: (x: number, y: number) => number,
): [string, string] {
  const rand = mulberry32(seed);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const small = new Dots(),
    big = new Dots();
  for (let gy = minY; gy <= maxY; gy += spacing) {
    for (let gx = minX; gx <= maxX; gx += spacing) {
      const x = gx + (rand() - 0.5) * spacing,
        y = gy + (rand() - 0.5) * spacing;
      const keep = rand() < density(x, y),
        isBig = rand() < 0.28;
      if (!keep || !inside(poly, x, y)) continue;
      (isBig ? big : small).add(x, y);
    }
  }
  return [small.d, big.d];
}

/** A seamless square stipple tile (dots near an edge repeat on the far side) for the end-grain texture. */
function stippleTile(
  seed: number,
  size: number,
  spacing: number,
  keepP: number,
): [string, string] {
  const rand = mulberry32(seed);
  const small = new Dots(),
    big = new Dots();
  const r = 1.6;
  for (let gy = 0; gy < size; gy += spacing) {
    for (let gx = 0; gx < size; gx += spacing) {
      const x = (((gx + (rand() - 0.5) * spacing) % size) + size) % size,
        y = (((gy + (rand() - 0.5) * spacing) % size) + size) % size;
      const keep = rand() < keepP,
        isBig = rand() < 0.3;
      if (!keep) continue;
      const to = isBig ? big : small;
      const xs = [x],
        ys = [y];
      if (x < r) xs.push(x + size);
      if (x > size - r) xs.push(x - size);
      if (y < r) ys.push(y + size);
      if (y > size - r) ys.push(y - size);
      for (const xx of xs) for (const yy of ys) to.add(xx, yy);
    }
  }
  return [small.d, big.d];
}

function Stipple({
  seed,
  poly,
  spacing,
  density,
  dot = 1.7,
}: {
  seed: number;
  poly: Pt[];
  spacing: number;
  density: (x: number, y: number) => number;
  dot?: number;
}) {
  const [small, big] = stipple(seed, poly, spacing, density);
  return (
    <g fill="none" stroke={INK} strokeLinecap="round">
      {small ? <path d={small} strokeWidth={dot} /> : null}
      {big ? <path d={big} strokeWidth={r1(dot * 1.5)} /> : null}
    </g>
  );
}

/** A wavy grain line from a to b around height c (or vertical when `vert`), following an optional bow. */
function wave(
  rand: Rand,
  a: number,
  b: number,
  c: number,
  amp: number,
  segs: number,
  vert = false,
  bowAt: (u: number) => number = () => 0,
): string {
  const P = (u: number, v: number) =>
    vert ? `${r1(v)} ${r1(u)}` : `${r1(u)} ${r1(v + bowAt(u))}`;
  const l = (b - a) / segs;
  let prev = c + (rand() - 0.5) * amp;
  let d = `M${P(a, prev)}`;
  for (let k = 0; k < segs; k++) {
    const u0 = a + l * k;
    const next = c + (rand() - 0.5) * 2 * amp;
    d += `C${P(u0 + l * 0.35, prev + (rand() - 0.5) * amp * 2)} ${P(u0 + l * 0.65, next + (rand() - 0.5) * amp * 2)} ${P(u0 + l, next)}`;
    prev = next;
  }
  return d;
}

/** A jagged check (crack) from (x, y) heading along (dx, dy) for about `len` px, with a fork. */
function crack(
  rand: Rand,
  x: number,
  y: number,
  dx: number,
  dy: number,
  len: number,
  wob = 3,
): { main: string; fork: string; lead: string } {
  const n = 5 + Math.floor(rand() * 3);
  const pts: Pt[] = [[x, y]];
  let cx = x,
    cy = y;
  for (let k = 0; k < n; k++) {
    const step = (len / n) * (0.6 + rand() * 0.8);
    cx += dx * step + dy * (rand() - 0.5) * 2 * wob;
    cy += dy * step + dx * (rand() - 0.5) * 2 * wob;
    pts.push([r1(cx), r1(cy)]);
  }
  const main = 'M' + pts.map(([a, b]) => `${a} ${b}`).join('L');
  const lead = `M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}`;
  const f = pts[2];
  const fl = len * 0.4;
  const fork = `M${f[0]} ${f[1]}l${r1(dx * fl * 0.5 + dy * 4)} ${r1(dy * fl * 0.5 + dx * 4)}l${r1(dx * fl * 0.5 - dy * 3)} ${r1(dy * fl * 0.5 - dx * 3)}`;
  return { main, fork, lead };
}

function Check({ c }: { c: { main: string; fork: string; lead: string } }) {
  return (
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <path d={c.main} strokeWidth={1.3} />
      <path d={c.lead} strokeWidth={2.2} />
      <path d={c.fork} strokeWidth={1.1} />
    </g>
  );
}

/** A plank edge from xa to xb at height y with light jitter, a bow, and an optional chip biting `into` (+1 down, -1 up). */
function edge(
  rand: Rand,
  xa: number,
  xb: number,
  y: number,
  into: number,
  chipAt: number | null,
  bowAt: (u: number) => number = () => 0,
): Pt[] {
  const pts: Pt[] = [];
  const n = 4;
  const cx =
    chipAt === null ? NaN : xa + (xb - xa) * (chipAt + (rand() - 0.5) * 0.05);
  const w = 16 + rand() * 12,
    depth = (3.5 + rand() * 3.5) * into;
  for (let k = 1; k < n; k++) {
    const x = xa + (xb - xa) * (k / n) + (rand() - 0.5) * 10;
    if (chipAt !== null && Math.abs(x - cx) < w) continue;
    pts.push([r1(x), r1(y + bowAt(x) + (rand() - 0.5) * 2)]);
  }
  if (chipAt !== null)
    pts.push(
      [r1(cx - w / 2), r1(y + bowAt(cx - w / 2))],
      [r1(cx - w * 0.2), r1(y + bowAt(cx) + depth)],
      [r1(cx + w * 0.15), r1(y + bowAt(cx) + depth * 0.55)],
      [r1(cx + w / 2), r1(y + bowAt(cx + w / 2))],
    );
  pts.sort((p, q) => (xb > xa ? p[0] - q[0] : q[0] - p[0]));
  return pts;
}

/**
 * Slab sides: the outline extruded along (ex, ey). Only edges whose outward
 * face turns toward the extrusion are visible; consecutive visible edges are
 * merged into one polygon so no seams split a face.
 */
function extrude(outline: Pt[], ex: number, ey: number): Pt[][] {
  const n = outline.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = outline[i],
      [x1, y1] = outline[(i + 1) % n];
    area += x0 * y1 - x1 * y0;
  }
  const cw = area > 0 ? 1 : -1;
  const vis = outline.map((p, i) => {
    const q = outline[(i + 1) % n];
    return cw * ((q[1] - p[1]) * ex - (q[0] - p[0]) * ey) > 0;
  });
  const start = Math.max(vis.indexOf(false), 0);
  const runs: number[][] = [];
  let cur: number[] = [];
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (vis[i]) cur.push(i);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs.map((run) => {
    const pts: Pt[] = run.map((i) => outline[i]);
    pts.push(outline[(run[run.length - 1] + 1) % n]);
    return [
      ...pts,
      ...pts.map(([x, y]) => [r1(x + ex), r1(y + ey)] as Pt).reverse(),
    ];
  });
}

/** Bold Phillips screw head: white dome, shaded lower rim, cross slot, rust ring and one drip. */
function Screw({
  x,
  y,
  k,
  r = 6.5,
}: {
  x: number;
  y: number;
  k: number;
  r?: number;
}) {
  const a = (k % 4) * 0.42 + 0.28,
    c = Math.cos(a),
    s = Math.sin(a),
    arm = r * 0.6;
  const cross = `M${r1(x - c * arm)} ${r1(y - s * arm)}L${r1(x + c * arm)} ${r1(y + s * arm)}M${r1(x + s * arm)} ${r1(y - c * arm)}L${r1(x - s * arm)} ${r1(y + c * arm)}`;
  const R = r + 3;
  const rust = [
    [0.94, 0.34],
    [0.57, 0.82],
    [0, 1],
    [-0.57, 0.82],
    [-0.94, 0.34],
  ]
    .filter((_, i) => i !== (k + 1) % 5)
    .map(([u, v]) => `M${r1(x + u * R)} ${r1(y + v * R)}h.1`)
    .join('');
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={rust} fill="none" stroke={INK} strokeWidth={1.6} />
      <path
        d={`M${r1(x + 1)} ${r1(y + R + 1)}q-1.6 6 .4 12`}
        fill="none"
        stroke={INK}
        strokeWidth={1.3}
      />
      <circle cx={r1(x + 1.4)} cy={r1(y + R + 14.5)} r={1.5} fill={INK} />
      <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth={2.2} />
      {/* domed head: a solid shadow crescent along the lower-right rim */}
      <circle cx={x} cy={y} r={r1(r - 0.8)} fill={INK} stroke="none" />
      <circle
        cx={r1(x - 1.5)}
        cy={r1(y - 1.5)}
        r={r1(r - 1.2)}
        fill="#fff"
        stroke="none"
      />
      <path d={cross} fill="none" stroke={INK} strokeWidth={2} />
    </g>
  );
}

/** Knot: concentric rings around a dark heart, a split running out of it, and the grain deflecting away on either side. */
function Knot({
  x,
  y,
  seed,
  r = 6.5,
  flow = 26,
  vert = false,
}: {
  x: number;
  y: number;
  seed: number;
  r?: number;
  flow?: number;
  vert?: boolean;
}) {
  const ry = r1(r * 1.15);
  const ring = {
    stroke: INK,
    roughness: 0.6,
    bowing: 0.3,
    disableMultiStroke: true,
  };
  // four short grain stubs that stop at the knot and drift apart from it (along the grain: across a plank, up and down a post)
  const g = r1((vert ? ry : r) + 4),
    f3 = r1(flow * 0.3),
    f6 = r1(flow * 0.6);
  const stub = (sx: number, sy: number) =>
    vert
      ? `M${r1(x + sy * 3.5)} ${r1(y - sx * g)}c${sy * 0.5} ${-sx * f3} ${sy * 1.5} ${-sx * f6} ${sy * 3} ${-sx * flow}`
      : `M${r1(x + sx * g)} ${r1(y + sy * 3.5)}c${sx * f3} ${sy * 0.5} ${sx * f6} ${sy * 1.5} ${sx * flow} ${sy * 3}`;
  const stubs = stub(-1, -1) + stub(-1, 1) + stub(1, -1) + stub(1, 1);
  return (
    <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <path d={stubs} strokeWidth={FINE} />
      <Rough
        kind="ellipse"
        cx={x}
        cy={y}
        w={r * 2}
        h={ry * 2}
        seed={seed}
        opts={{ ...ring, strokeWidth: 1.7, fill: '#fff', fillStyle: 'solid' }}
      />
      <Rough
        kind="ellipse"
        cx={x + 0.5}
        cy={y + 0.4}
        w={r * 1.25}
        h={ry * 1.25}
        seed={seed + 1}
        opts={{ ...ring, strokeWidth: 1.2 }}
      />
      <ellipse
        cx={r1(x + 0.8)}
        cy={r1(y + 0.6)}
        rx={r1(r * 0.4)}
        ry={r1(ry * 0.4)}
        fill={INK}
        stroke="none"
      />
      <path
        d={`M${r1(x + 0.6)} ${r1(y + ry * 0.45)}l-1.4 ${r1(ry * 0.45)}l1.6 ${r1(ry * 0.5)}l-1 ${r1(ry * 0.4)}`}
        strokeWidth={1.3}
      />
    </g>
  );
}

/** A leaf on the vine: pointed oval with a midrib, laid along angle `a`. */
function Leaf({ x, y, a, len = 20 }: { x: number; y: number; a: number; len?: number }) {
  const h = len * 0.38;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path
        d={`M0 0C${r1(len * 0.25)} ${r1(-h)} ${r1(len * 0.72)} ${r1(-h)} ${len} 0C${r1(len * 0.72)} ${r1(h)} ${r1(len * 0.25)} ${r1(h)} 0 0Z`}
        fill="#fff"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d={`M2 0L${r1(len - 3)} 0M${r1(len * 0.4)} 0l4 -3M${r1(len * 0.6)} 0l4 3`}
        fill="none"
        stroke={INK}
        strokeWidth={1.1}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Grass tuft at (x, y): a few thin blades. */
function tuft(
  rand: Rand,
  x: number,
  y: number,
  n: number,
  hmax: number,
): string {
  let d = '';
  for (let k = 0; k < n; k++) {
    const bx = x + (rand() - 0.5) * 18,
      h = hmax * (0.4 + rand() * 0.6),
      lean = (rand() - 0.5) * 34;
    d += `M${r1(bx)} ${r1(y)}Q${r1(bx + lean * 0.25)} ${r1(y - h * 0.6)} ${r1(bx + lean)} ${r1(y - h)}`;
  }
  return d;
}

/** Short weather marks: little dashes and ticks. */
function marks(
  rand: Rand,
  boxes: [number, number, number, number][],
  n: number,
): string {
  let d = '';
  for (let k = 0; k < n; k++) {
    const [x0, y0, x1, y1] = boxes[k % boxes.length];
    const x = lerp(x0, x1, rand()),
      y = lerp(y0, y1, rand()),
      l = 3 + rand() * 6,
      t = (rand() - 0.5) * 2;
    d += `M${r1(x)} ${r1(y)}l${r1(l)} ${r1(t)}`;
  }
  return d;
}

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
  const boardW = compact ? 540 : 600,
    boardH = 120,
    boardY = 64;
  const plankH = 92,
    gap = 16;
  const top = boardY + boardH + 44;
  const rand = mulberry32(seed * 7919 + 11);
  // in-plane tilt: alternating, far ends lifted; the first plank sits under the board so it tilts least; same-direction neighbours stay parallel
  // planks hang level; the apparent slope comes from the camera (a plank pointing out of the page below eye
  // level dips toward you, one above it rises), so only a hair of in-plane wobble is added here
  const rots: number[] = planks.map(() => r1((rand() - 0.5) * 3));
  // yaw about the post (a CSS 3D rotation): each plank swings toward or away from the viewer, within 30 degrees
  const YAWS = [36, -22, 40, -30, 26, -40, 30];
  const yaws = planks.map((_, i) => YAWS[i % YAWS.length]);
  // stack: neighbours that differ more in angle get more room, so their converging ends never cross a label
  const ys: number[] = [];
  let yy = top;
  planks.forEach((_, i) => {
    if (i > 0) {
      const d = (Math.abs(rots[i] - rots[i - 1]) * Math.PI) / 180;
      // lower planks sit further below the camera, so their near ends dip more: open the gap as the stack goes down
      yy += plankH + gap + i * 22 + Math.max(0, Math.round(300 * Math.tan(d)) - gap);
    }
    ys.push(yy);
  });
  const stackEnd = ys[ys.length - 1] + plankH;
  const groundY = stackEnd + 236;
  const H = groundY + 66;
  const postTop = boardY + 62; // hidden behind the title board
  const pid = `sg-c-grain-${seed}`;
  const cid = `sg-c-post-${seed}`;
  const tile = stippleTile(seed * 31 + 9, TILE, 3.8, 0.55);

  // ---- plank angles: alternating tilt, far ends lifted; the first plank sits under the board so it tilts least, later ones droop more; same-direction neighbours stay parallel so tips never collide

  // ---- post: tapered, a touch wider at the foot
  const pw0 = 33,
    pw1 = 37;
  const postPoly: Pt[] = [
    [postX - pw0, postTop],
    [postX + pw0, postTop],
  ];
  for (let k = 1; k < 6; k++)
    postPoly.push([
      r1(lerp(postX + pw0, postX + pw1, k / 6) + (rand() - 0.5) * 3),
      r1(lerp(postTop, groundY, k / 6)),
    ]);
  postPoly.push([postX + pw1, groundY + 4], [postX - pw1, groundY + 4]);
  for (let k = 5; k >= 1; k--)
    postPoly.push([
      r1(lerp(postX - pw0, postX - pw1, k / 6) + (rand() - 0.5) * 3),
      r1(lerp(postTop, groundY, k / 6)),
    ]);
  const postDensity = (x: number, y: number) => {
    const u = (x - (postX - pw1)) / (pw1 * 2);
    let d = u > 0.5 ? ((u - 0.5) / 0.5) ** 2 * 0.7 : 0.012;
    if (y > groundY - 22) d += ((y - groundY + 22) / 26) * 0.45;
    return Math.min(d, 0.95);
  };
  const postGrain = [
    wave(rand, postTop + 40, groundY - 6, postX - 16, 2.4, 6, true),
    wave(rand, postTop + 60, groundY - 2, postX - 2, 2.8, 7, true),
    wave(rand, postTop + 30, groundY - 10, postX + 14, 2.2, 6, true),
    wave(rand, stackEnd + 20, groundY - 30, postX + 26, 1.6, 3, true),
  ];
  const postKnotY = stackEnd + 70 + rand() * 30;
  const postCheck = crack(rand, postX - 10, groundY - 2, 0, -1, 130, 2.5);
  const postCheck2 = crack(rand, postX + 22, postTop + 200 + rand() * 60, 0, 1, 50, 1.6);
  const postMarks = marks(
    rand,
    [[postX - 28, stackEnd + 20, postX + 28, groundY - 20]],
    10,
  );
  const vine = `M${r1(postX - 30)} ${r1(groundY + 2)}C${r1(postX - 52)} ${r1(groundY - 28)} ${r1(postX - 22)} ${r1(groundY - 54)} ${r1(postX - 40)} ${r1(groundY - 84)}S${r1(postX - 26)} ${r1(groundY - 122)} ${r1(postX - 38)} ${r1(groundY - 140)}`;

  // ---- ground: flat shadow pool, cast-shadow wedge to the lower right, stipple, mud at the foot
  const gcx = postX + 26,
    gcy = groundY + 12,
    grx = 300,
    gry = 30;
  const wedge: Pt[] = [
    [postX - pw1, groundY + 2],
    [postX + pw1, groundY + 2],
    [postX + 190, groundY + 24],
    [postX + 150, groundY + 36],
    [postX + 30, groundY + 32],
    [postX - 20, groundY + 18],
  ];
  const wedgePath = `M${postX - pw1} ${groundY + 2}L${postX + pw1} ${groundY + 2}Q${postX + 140} ${groundY + 6} ${postX + 190} ${groundY + 24}Q${postX + 184} ${groundY + 38} ${postX + 130} ${groundY + 37}Q${postX + 40} ${groundY + 36} ${postX - 20} ${groundY + 18}Z`;
  const groundPoly: Pt[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    groundPoly.push([r1(gcx + Math.cos(a) * grx), r1(gcy + Math.sin(a) * gry)]);
  }
  const groundDensity = (x: number, y: number) => {
    const r = Math.sqrt(((x - gcx) / grx) ** 2 + ((y - gcy) / gry) ** 2);
    let d = r < 1 ? (1 - r) ** 1.4 * 0.5 : 0;
    const px = Math.abs(x - postX);
    if (px < 80 && y > groundY - 4) d += (1 - px / 80) * 0.55;
    if (inside(wedge, x, y)) d += 0.18;
    return d;
  };
  const mud = wave(rand, postX - 48, postX + 50, groundY + 3, 1.6, 3);
  const grassBack =
    tuft(rand, postX - 26, groundY + 2, 9, 78) +
    tuft(rand, postX + 30, groundY + 2, 9, 70) +
    tuft(rand, postX - 210, groundY + 6, 6, 40) +
    tuft(rand, postX + 236, groundY + 8, 6, 42);
  const grassFront =
    tuft(rand, postX - 50, groundY + 8, 10, 66) +
    tuft(rand, postX + 54, groundY + 9, 10, 60) +
    tuft(rand, postX - 150, groundY + 16, 7, 44) +
    tuft(rand, postX + 170, groundY + 18, 7, 40) +
    tuft(rand, postX + 100, groundY + 26, 5, 26) +
    tuft(rand, postX - 100, groundY + 28, 5, 24) +
    tuft(rand, postX - 262, groundY + 14, 4, 22) +
    tuft(rand, postX + 300, groundY + 14, 4, 22);
  const pebbles: [number, number, number, number][] = [
    [postX - 106, groundY + 22, 18, 10],
    [postX + 128, groundY + 28, 13, 8],
    [postX - 132, groundY + 30, 9, 6],
    [postX + 230, groundY + 26, 12, 7],
    [postX - 76, groundY + 36, 8, 5],
    [postX - 216, groundY + 18, 10, 6],
    [postX + 268, groundY + 16, 8, 5],
  ];

  // ---- title board (drawn in place, then rotated)
  const bx0 = postX - boardW / 2,
    bx1 = postX + boardW / 2,
    by0 = boardY,
    by1 = boardY + boardH,
    c = 14;
  const bTop = edge(rand, bx0 + c, bx1 - c, by0, 1, 0.25);
  const bBot = edge(rand, bx1 - c, bx0 + c, by1, -1, 0.75);
  const boardFront: Pt[] = [
    [bx0 + c, by0],
    ...bTop,
    [bx1 - c, by0],
    [bx1, by0 + c],
    [r1(bx1 + 1.5), r1(by0 + boardH * 0.45)],
    [bx1, by1 - c],
    [bx1 - c, by1],
    ...bBot,
    [bx0 + c, by1],
    [bx0, by1 - c],
    [r1(bx0 - 1), r1(by0 + boardH * 0.55)],
    [bx0, by0 + c],
  ];
  const boardSides = extrude(boardFront, EX, EY);
  const boardDensity = (x: number, y: number) => {
    const tb = (y - by0) / boardH;
    let d = tb > 0.62 ? ((tb - 0.62) / 0.38) ** 1.7 * 0.55 : 0;
    if (tb < 0.12) d += 0.06;
    if (x > bx1 - 40) d += ((x - bx1 + 40) / 40) * 0.2;
    if (x < bx0 + 30) d += ((bx0 + 30 - x) / 30) * 0.25;
    return d + 0.012;
  };
  const boardGrain = [
    wave(rand, bx0 + 22, bx1 - 26, by0 + 17, 2.4, 5),
    wave(rand, bx0 + 28, bx1 - 20, by1 - 20, 2.6, 5),
    wave(rand, bx0 + 20, bx0 + 110, by0 + boardH / 2 + 4, 1.8, 2),
    wave(rand, bx1 - 150, bx1 - 24, by0 + boardH / 2 - 6, 1.6, 2),
  ];
  const boardCheck = crack(rand, bx1 + 1, by0 + 72, -1, 0, 64, 2.5);
  const boardCheck2 = crack(rand, bx0 - 1, by0 + 56, 1, 0, 44, 2);
  const boardMarks = marks(
    rand,
    [
      [bx0 + 40, by0 + 6, bx1 - 40, by0 + 22],
      [bx0 + 40, by1 - 26, bx1 - 40, by1 - 8],
    ],
    12,
  );
  // the board tilts away from the first plank's lifted end so the two never touch
  const boardRot = planks[0]?.dir === 'left' ? 3.5 : -3.5;
  const boardCy = by0 + boardH / 2;

  // ---- contact shadows on the post: a solid ink band under the board and under each plank's thickness face, following its tilt
  const band = (
    yAt: (x: number) => number,
    deg: number,
    cx: number,
    cy: number,
    h: number,
  ): Pt[] => {
    const xs = [-52, -26, 0, 26, 52].map((d) => postX + d);
    const upper = xs.map((x) => rot(x, yAt(x), deg, cx, cy));
    return [...upper, ...upper.map(([x, y]) => [x, r1(y + h)] as Pt).reverse()];
  };
  const bands: Pt[][] = [
    band(() => by1 + EY - 3, boardRot, postX, boardCy, 12),
  ];

  const plankGeom = planks.map((p, i) => {
    const pr = mulberry32(seed * 104729 + i * 7919 + 3);
    const s = p.dir === 'right' ? 1 : -1;
    const y0 = ys[i];
    const h = plankH;
    const y1 = y0 + h,
      mid = y0 + h / 2;
    const long = p.label.length > 11;
    const L = compact
      ? p.small
        ? 380
        : 520
      : p.small
        ? 460
        : long
          ? 640
          : 620;
    const tip = compact ? 72 : p.small ? 74 : 90;
    const tail = Math.round(L * (long ? 0.38 : 0.4) + (pr() - 0.5) * 16);
    const xt = postX - s * tail;
    const xh = xt + s * L;
    const xhb = xh - s * tip;
    // slight banana bow: both long edges rise a few px mid-length
    const bow = 3 + pr() * 2.5;
    const bowAt = (x: number) =>
      -bow * Math.sin((Math.PI * Math.min(Math.max((x - xt) / (xh - xt), 0), 1)));
    const chipSpots = [0.25, 0.58, 0.75, 0.92, null];
    const topE = edge(pr, xt, xhb, y0, 1, chipSpots[Math.floor(pr() * 5)], bowAt);
    const botE = edge(pr, xhb, xt, y1, -1, chipSpots[Math.floor(pr() * 5)], bowAt);
    // arrow head: long point, tip blunted by a chip; sometimes a bite out of the upper slant
    const headBite = pr() < 0.5;
    const head: Pt[] = [
      [xhb, r1(y0 + bowAt(xhb))],
      ...(headBite
        ? ([
            [r1(xhb + s * tip * 0.38), r1(y0 + h * 0.19)],
            [r1(xhb + s * tip * 0.42), r1(y0 + h * 0.27)],
            [r1(xhb + s * tip * 0.52), r1(y0 + h * 0.26)],
          ] as Pt[])
        : []),
      [r1(xh - s * 4), r1(mid - 5 + pr() * 3)],
      [xh, r1(mid + 1 + pr() * 3)],
      [xhb, r1(y1 + bowAt(xhb))],
    ];
    // tail cycle: sawn cut with chamfered corners / pointed both ends / swallow-tail notch
    const tailKind = (i + seed) % 3;
    const tailE: Pt[] =
      tailKind === 1
        ? [
            [xt, y1 - 7],
            [r1(xt - s * tip * 0.5), r1(mid + 2 + (pr() - 0.5) * 6)],
            [xt, y0 + 7],
          ]
        : tailKind === 2
          ? [
              [xt, y1 - 5],
              [r1(xt + s * 26), r1(mid + (pr() - 0.5) * 6)],
              [xt, y0 + 5],
            ]
          : [
              [r1(xt + s * 5), y1],
              [xt, r1(y1 - 6)],
              [r1(xt - s * 3), r1(y1 - h * 0.3)],
              [r1(xt + s * 2.5), r1(y1 - h * 0.52)],
              [r1(xt - s * 1.5), r1(y0 + h * 0.24)],
              [xt, r1(y0 + 5)],
              [r1(xt + s * 5), y0],
            ];
    const front: Pt[] = [...topE, ...head, ...botE, ...tailE];
    const sides = extrude(front, EX, EY);
    const textX = r1((xt + s * 34 + xhb) / 2);
    const fontSize = p.small ? 44 : long && compact ? 46 : 54;
    const halfText = p.label.length * fontSize * 0.26;
    const density = (x: number, y: number) => {
      const tb = (y - y0 - bowAt(x)) / h;
      let d = tb > 0.6 ? ((tb - 0.6) / 0.4) ** 1.6 * 0.55 : 0;
      if (tb < 0.13) d += 0.05;
      const te = Math.abs(x - xt);
      if (te < 40) d += (1 - te / 40) * 0.32;
      const near =
        Math.abs(y - mid) < 26 && Math.abs(x - textX) < halfText + 8;
      return d + (near ? 0.006 : 0.028);
    };
    const grainA = wave(pr, xt + s * 12, xhb - s * 8, y0 + 12 + pr() * 4, 2.2, 5, false, bowAt);
    const grainB = wave(pr, xt + s * 18, xhb - s * 14, y1 - 13 - pr() * 4, 2.4, 5, false, bowAt);
    const grainC = wave(pr, xt + s * 8, postX - s * 34, mid + (pr() - 0.5) * 12, 1.8, 2, false, bowAt);
    const grainD = wave(pr, xhb + s * 10, xh - s * 18, mid - 4 + pr() * 8, 1.4, 1);
    const checkA = crack(pr, xt + s * 4, mid + (pr() - 0.5) * 20, s, 0, 44 + pr() * 30, 2.2);
    const checkB = crack(pr, xh, mid + 1, -s, 0, 34 + pr() * 22, 1.8);
    // knots cycle down the stack: head knot, tail knot, none; a head knot takes the tip check's place
    const knotKind = (i + seed) % 3;
    const hasKnot = knotKind !== 2;
    const knotAtHead = knotKind === 0;
    const hasTipCheck = !knotAtHead && pr() < 0.85;
    const knot: Pt = knotAtHead
      ? [r1(xhb + s * 20), r1(mid + (pr() - 0.5) * 8)]
      : [r1(xt + s * (28 + pr() * 10)), r1(mid + (pr() < 0.5 ? -23 : 23))];
    // old nail holes: tiny dark pits
    const holes: Pt[] = [];
    for (let k = 0; k < 3; k++)
      holes.push([
        r1(lerp(Math.min(xt, xhb) + 24, Math.max(xt, xhb) - 24, pr())),
        r1(k % 2 ? y1 - 10 - pr() * 12 : y0 + 10 + pr() * 12),
      ]);
    const wm = marks(
      pr,
      [
        [Math.min(xt, xhb) + 20, y0 + 5, Math.max(xt, xhb) - 20, y0 + 19],
        [Math.min(xt, xhb) + 20, y1 - 24, Math.max(xt, xhb) - 20, y1 - 7],
      ],
      10,
    );
    const nailJ = [(pr() - 0.5) * 4, (pr() - 0.5) * 4, (pr() - 0.5) * 4, (pr() - 0.5) * 4];
    // its shadow lands on the post (drawn in the base, clipped to the post), just under the level plank
    bands.push(band((x) => y1 + bowAt(x) + 2, 0, postX, mid, 9));
    return {
      p,
      s,
      y0,
      y1,
      mid,
      xt,
      xh,
      xhb,
      front,
      sides,
      textX,
      fontSize,
      long,
      density,
      grain: [grainA, grainB, grainC, grainD],
      checkA,
      checkB,
      hasKnot,
      hasTipCheck,
      knot,
      holes,
      wm,
      nailJ,
    };
  });

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  return (
    <div className="sg-post3d" style={{ ['--arn' as string]: W / H, aspectRatio: `${W} / ${H}` } as CSSProperties}>
    <svg
      className="sg-post"
      viewBox={`0 0 ${W} ${H}`}
      aria-label={`${title} signpost`}
    >
      <defs>
        {/* end-grain stipple for every thickness face: one seamless tile on a flat light grey */}
        <pattern
          id={pid}
          patternUnits="userSpaceOnUse"
          width={TILE}
          height={TILE}
        >
          <rect width={TILE} height={TILE} fill={FACE} />
          <g fill="none" stroke={INK} strokeLinecap="round">
            <path d={tile[0]} strokeWidth={1.5} />
            <path d={tile[1]} strokeWidth={2.2} />
          </g>
        </pattern>
        <clipPath id={cid}>
          <polygon points={pts2s(postPoly)} />
        </clipPath>
      </defs>

      {/* ground: shadow pool, the post's cast shadow, stipple, pebbles, grass behind the post */}
      <ellipse
        cx={gcx}
        cy={gcy}
        rx={grx}
        ry={gry}
        fill={POOL}
        stroke={POOL_EDGE}
        strokeWidth={1.2}
      />
      <path d={wedgePath} fill={WEDGE} stroke="none" />
      <Stipple
        seed={seed * 31 + 5}
        poly={groundPoly}
        spacing={3.6}
        density={groundDensity}
        dot={1.7}
      />
      {pebbles.map(([x, y, w, h], k) => (
        <Rough
          key={k}
          kind="ellipse"
          cx={x}
          cy={y}
          w={w}
          h={h}
          seed={seed + 200 + k}
          opts={{
            stroke: INK,
            strokeWidth: 1.5,
            roughness: 0.8,
            bowing: 0.4,
            fill: '#fff',
            fillStyle: 'solid',
            disableMultiStroke: true,
          }}
        />
      ))}
      <path
        d={grassBack}
        fill="none"
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* post: tapered, grained, checked at the foot, stippled on its shaded side, solid contact shadows under every board */}
      <Rough
        kind="poly"
        points={postPoly}
        seed={seed + 1}
        opts={{
          stroke: INK,
          strokeWidth: LINE,
          roughness: 1,
          bowing: 0.4,
          fill: '#fff',
          fillStyle: 'solid',
        }}
      />
      <g fill="none" stroke={INK} strokeWidth={FINE} strokeLinecap="round">
        {postGrain.map((d, k) => (
          <path key={k} d={d} />
        ))}
        <path d={postMarks} />
      </g>
      <Knot x={postX + 8} y={r1(postKnotY)} seed={seed + 3} r={9} flow={30} vert />
      <Check c={postCheck} />
      <Check c={postCheck2} />
      <Stipple
        seed={seed * 31 + 7}
        poly={postPoly}
        spacing={3.4}
        density={postDensity}
        dot={1.6}
      />
      <g clipPath={`url(#${cid})`}>
        {bands.map((b, k) => (
          <polygon key={k} points={pts2s(b)} fill="#a3a3a3" stroke="none" />
        ))}
      </g>
      {/* mud line where the post meets the ground, and a vine creeping up its shaded-away side */}
      <path
        d={mud}
        fill="none"
        stroke={INK}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d={vine}
        fill="none"
        stroke={INK}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Leaf x={postX - 48} y={groundY - 26} a={-150} />
      <Leaf x={postX - 30} y={groundY - 62} a={-25} len={17} />
      <Leaf x={postX - 43} y={groundY - 104} a={-160} len={18} />

      {/* title board: the top of the whole thing */}
      <g transform={`rotate(${boardRot} ${postX} ${boardCy})`}>
        {boardSides.map((poly, k) => (
          <polygon
            key={k}
            points={pts2s(poly)}
            fill={`url(#${pid})`}
            stroke={INK}
            strokeWidth={EDGE}
            strokeLinejoin="round"
          />
        ))}
        <Rough
          kind="poly"
          points={boardFront}
          seed={seed + 4}
          opts={{
            stroke: INK,
            strokeWidth: LINE,
            roughness: 0.9,
            bowing: 0.4,
            fill: '#fff',
            fillStyle: 'solid',
          }}
        />
        <g fill="none" stroke={INK} strokeWidth={FINE} strokeLinecap="round">
          {boardGrain.map((d, k) => (
            <path key={k} d={d} />
          ))}
          <path d={boardMarks} />
        </g>
        <Stipple
          seed={seed * 31 + 11}
          poly={boardFront}
          spacing={4}
          density={boardDensity}
          dot={1.6}
        />
        <Knot x={bx1 - 62} y={by1 - 40} seed={seed + 5} r={8} flow={30} />
        <Check c={boardCheck} />
        <Check c={boardCheck2} />
        <Screw x={bx0 + 28} y={by0 + 27} k={0} />
        <Screw x={bx1 - 28} y={by0 + 26} k={1} />
        <Screw x={bx0 + 29} y={by1 - 27} k={2} />
        <Screw x={bx1 - 27} y={by1 - 28} k={3} />
        <text
          x={postX}
          y={boardCy + 22}
          textAnchor="middle"
          className="sg-title"
          style={{ fontSize: compact ? 56 : 62 }}
        >
          {title}
        </text>
      </g>

      {/* grass in front of the foot */}
      <path
        d={grassFront}
        fill="none"
        stroke={INK}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
      {/* planks */}
      <div className="sg-slabs">
      {plankGeom.map((g, i) => {
        const bx0 = Math.min(g.xt, g.xh) - 70, bx1 = Math.max(g.xt, g.xh) + 70;
        const by0 = g.y0 - 44, by1 = g.y1 + 48;
        const bw = bx1 - bx0, bh = by1 - by0;
        const style = {
          left: pct(bx0 / W), top: pct(by0 / H), width: pct(bw / W), height: pct(bh / H),
          ['--tilt' as string]: `${rots[i]}deg`, ['--yaw' as string]: `${yaws[i]}deg`,
          ['--ox' as string]: pct((postX - bx0) / bw), ['--oy' as string]: pct((g.mid - by0) / bh),
        } as CSSProperties;
        // the slab body (tail to arrow-head base) gets top, bottom and sawn-end faces
        const bodyA = Math.min(g.xt, g.xhb), bodyB = Math.max(g.xt, g.xhb);
        const faceX = { left: pct((bodyA - bx0) / bw), width: pct((bodyB - bodyA) / bw) };
        const endStyle: CSSProperties = g.s === 1
          ? { left: `calc(${pct((g.xt - bx0) / bw)} - var(--t))`, transformOrigin: 'right', transform: 'rotateY(-90deg)' }
          : { left: pct((g.xt - bx0) / bw), transformOrigin: 'left', transform: 'rotateY(90deg)' };
        // the arrow head's two cut faces: each hinges on its edge and folds back into the page
        const tipFace = (ax: number, ay: number, bxx: number, byy: number, key: string) => {
          const dx = bxx - ax, dy = byy - ay;
          const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
          return <span key={key} className="pk-face pk-tip" style={{ left: pct((ax - bx0) / bw), top: pct((ay - by0) / bh), width: pct(Math.hypot(dx, dy) / bw), transformOrigin: '0 0', transform: `rotate(${ang.toFixed(2)}deg) rotateX(-90deg)` }} />;
        };
        return (
        <a
          key={g.p.label}
          className="sg-plank3d"
          href={g.p.href}
          aria-label={g.p.label}
          onClick={() => onPlank?.(g.p)}
          style={style}
        >
          <span className="pk-face pk-top" style={{ ...faceX, top: `calc(${pct((g.y0 - by0) / bh)} - var(--t))` }} />
          <span className="pk-face pk-bottom" style={{ ...faceX, top: pct((g.y1 - by0) / bh) }} />
          <span className="pk-face pk-end" style={{ ...endStyle, top: pct((g.y0 - by0) / bh), height: pct((g.y1 - g.y0) / bh) }} />
          {tipFace(g.xhb, g.y0, g.xh, g.mid, 'tu')}
          {tipFace(g.xhb, g.y1, g.xh, g.mid, 'tl')}
          <svg className="pk-front" viewBox={`${bx0} ${by0} ${bw} ${bh}`} aria-hidden="true">
            <g>
              {/* front face */}
              <Rough
                kind="poly"
                points={g.front}
                seed={seed + 10 + i}
                opts={{
                  stroke: INK,
                  strokeWidth: LINE,
                  roughness: 0.9,
                  bowing: 0.4,
                  fill: '#fff',
                  fillStyle: 'solid',
                }}
              />
              <g
                fill="none"
                stroke={INK}
                strokeWidth={FINE}
                strokeLinecap="round"
              >
                {g.grain.map((d, k) => (
                  <path key={k} d={d} />
                ))}
                <path d={g.wm} />
              </g>
              <Stipple
                seed={seed * 31 + 60 + i}
                poly={g.front}
                spacing={4}
                density={g.density}
                dot={1.6}
              />
              <Check c={g.checkA} />
              {g.hasTipCheck ? <Check c={g.checkB} /> : null}
              {g.holes.map(([hx, hy], k) => (
                <circle key={k} cx={hx} cy={hy} r={1.9} fill={INK} />
              ))}
              {g.hasKnot && (
                <Knot x={g.knot[0]} y={g.knot[1]} seed={seed + 80 + i} />
              )}
              {/* two screws into the post, set toward the tail so the label zone stays clear */}
              <Screw
                x={r1(postX - 9 + g.nailJ[0])}
                y={r1(g.y0 + 12 + g.nailJ[1] * 0.5)}
                k={i}
              />
              <Screw
                x={r1(postX + 9 + g.nailJ[2])}
                y={r1(g.y1 - 12 + g.nailJ[3] * 0.5)}
                k={i + 2}
              />
              <text
                x={g.textX}
                y={r1(g.mid + g.fontSize * 0.35)}
                textAnchor="middle"
                className={`sg-label${g.p.small ? ' sg-label-small' : ''}${g.long ? ' sg-label-long' : ''}`}
                style={{ fontSize: g.fontSize }}
              >
                {g.p.label}
              </text>
            </g>
          </svg>
        </a>
        );
      })}
      </div>
    </div>
  );
}

