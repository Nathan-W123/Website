/**
 * Neon-sign math for the photoreal cinematic (docs/photoreal-spec.md, layers 2 and 4).
 *
 * - `coverFit` is the compositor's own cover-fit (re-exported) so the HTML overlay
 *   lands on the same plate pixels the shader samples.
 * - `quadToMatrix3d` maps an element box (0,0)-(elemW,elemH) onto the screen-space
 *   quad of the windshield text with an 8-DOF homography (4-point correspondence,
 *   adjugate method) and returns it as a CSS `matrix3d(...)` string.
 * - `lerpQuad` interpolates keyframe quads between plates.
 * - `makeFlicker` schedules the highlight flicker (`uFlicker`) deterministically.
 * - `_selfTest` checks the homography round trip (and the helpers) to within 0.5 px.
 *
 * Element requirements for `quadToMatrix3d`: the element must have
 * `transform-origin: 0 0`, sit at the top-left of the fixed full-screen layer
 * (`position:absolute; left:0; top:0`), and have a layout box of exactly
 * `elemW x elemH` CSS px (measure with `offsetWidth` / `offsetHeight`).
 */

import { coverFit, type CoverFit } from './compositor';
import type { Quad } from './keyframes';

/**
 * The compositor's cover-fit is the single source of truth (mirrored in its GLSL);
 * it is re-exported here so overlay code gets the same placement without importing
 * the compositor module directly.
 */
export { coverFit };
export type { CoverFit };

export type Point = readonly [number, number];

/** Row-major 3x3 homography [a b c; d e f; g h i]. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * Screen-space (CSS px) corners of a normalised plate quad under cover-fit:
 * `scale = max(viewW/plateW, viewH/plateH) * zoom`, the plate is centred, then panned
 * by `offset * (viewW, viewH)`; plate coord (u, v) lands at
 * `(tx + u * plateW * scale, ty + v * plateH * scale)`.
 */
export function quadToScreen(
  quad: Quad,
  plateW: number,
  plateH: number,
  viewW: number,
  viewH: number,
  zoom: number,
  offset: Point,
): Quad {
  const { scale, tx, ty } = coverFit(
    plateW,
    plateH,
    viewW,
    viewH,
    zoom,
    offset,
  );
  const map = (p: Point): [number, number] => [
    tx + p[0] * plateW * scale,
    ty + p[1] * plateH * scale,
  ];
  return [map(quad[0]), map(quad[1]), map(quad[2]), map(quad[3])];
}

export function lerpQuad(a: Quad, b: Quad, t: number): Quad {
  const mix = (i: 0 | 1 | 2 | 3, j: 0 | 1) => a[i][j] + (b[i][j] - a[i][j]) * t;
  return [
    [mix(0, 0), mix(0, 1)],
    [mix(1, 0), mix(1, 1)],
    [mix(2, 0), mix(2, 1)],
    [mix(3, 0), mix(3, 1)],
  ];
}

// ---------------------------------------------------------------------------
// Homography (adjugate method)
// ---------------------------------------------------------------------------

function adjugate(m: Mat3): Mat3 {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function multiply(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out.push(
        a[row * 3] * b[col] +
          a[row * 3 + 1] * b[3 + col] +
          a[row * 3 + 2] * b[6 + col],
      );
    }
  }
  return [
    out[0],
    out[1],
    out[2],
    out[3],
    out[4],
    out[5],
    out[6],
    out[7],
    out[8],
  ];
}

function applyToVector(
  m: Mat3,
  v: readonly [number, number, number],
): [number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Matrix taking the projective basis e1, e2, e3, e4=(1,1,1) to p1, p2, p3, p4. */
function basisToPoints(p1: Point, p2: Point, p3: Point, p4: Point): Mat3 {
  const m: Mat3 = [p1[0], p2[0], p3[0], p1[1], p2[1], p3[1], 1, 1, 1];
  const v = applyToVector(adjugate(m), [p4[0], p4[1], 1]);
  return multiply(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/**
 * Homography mapping the box (0,0),(w,0),(w,h),(0,h) onto `dst` = [tl, tr, br, bl],
 * normalised so that the last entry is 1. `null` when degenerate (zero-size box,
 * collinear targets, non-finite numbers).
 */
export function boxToQuadHomography(
  w: number,
  h: number,
  dst: Quad,
): Mat3 | null {
  if (!(w > 0) || !(h > 0)) return null;
  const source = basisToPoints([0, 0], [w, 0], [0, h], [w, h]);
  const target = basisToPoints(dst[0], dst[1], dst[3], dst[2]);
  const raw = multiply(target, adjugate(source));
  const scale = raw[8];
  if (!Number.isFinite(scale) || Math.abs(scale) < 1e-12) return null;
  const m: Mat3 = [
    raw[0] / scale,
    raw[1] / scale,
    raw[2] / scale,
    raw[3] / scale,
    raw[4] / scale,
    raw[5] / scale,
    raw[6] / scale,
    raw[7] / scale,
    1,
  ];
  for (const value of m) if (!Number.isFinite(value)) return null;
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;
  return m;
}

/** Plain decimal (never exponent notation, which older CSS parsers reject). */
function fmt(value: number): string {
  const text = value.toFixed(8).replace(/\.?0+$/, '');
  return text === '' || text === '-0' ? '0' : text;
}

/**
 * CSS `matrix3d(...)` (column-major) embedding a 3x3 homography [a b c; d e f; g h i]:
 * rows [a d 0 g], [b e 0 h], [0 0 1 0], [c f 0 i] of the argument list.
 */
export function homographyToMatrix3d(m: Mat3): string {
  const values = [
    m[0],
    m[3],
    0,
    m[6],
    m[1],
    m[4],
    0,
    m[7],
    0,
    0,
    1,
    0,
    m[2],
    m[5],
    0,
    m[8],
  ];
  return `matrix3d(${values.map(fmt).join(', ')})`;
}

/** Collapses the element to a point (invisible) at the quad centroid. */
function collapsedMatrix3d(dst: Quad): string {
  const cx = (dst[0][0] + dst[1][0] + dst[2][0] + dst[3][0]) / 4;
  const cy = (dst[0][1] + dst[1][1] + dst[2][1] + dst[3][1]) / 4;
  const x = Number.isFinite(cx) ? cx : 0;
  const y = Number.isFinite(cy) ? cy : 0;
  return `matrix3d(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, ${fmt(x)}, ${fmt(y)}, 0, 1)`;
}

/**
 * CSS `matrix3d(...)` that maps the element box (0,0)-(elemW,elemH) onto `quad`
 * (normalised plate coords, tl/tr/br/bl) as it appears on screen under the compositor's
 * cover-fit (`plateW x plateH` plate in a `viewW x viewH` view, with `zoom` and pan
 * `offset`). Requires `transform-origin: 0 0` on the element. Degenerate inputs yield a
 * matrix that collapses the element to a point rather than NaN.
 */
export function quadToMatrix3d(
  quad: Quad,
  plateW: number,
  plateH: number,
  viewW: number,
  viewH: number,
  zoom: number,
  offset: Point,
  elemW: number,
  elemH: number,
): string {
  const dst = quadToScreen(quad, plateW, plateH, viewW, viewH, zoom, offset);
  const h = boxToQuadHomography(elemW, elemH, dst);
  return h ? homographyToMatrix3d(h) : collapsedMatrix3d(dst);
}

// ---------------------------------------------------------------------------
// Highlight flicker (uFlicker)
// ---------------------------------------------------------------------------

/** Time is divided into 1 s windows; each window may start at most one event. */
const FLICKER_WINDOW = 1;
/** Probability that a window starts an event (mean gap ~3.6 s). */
const FLICKER_EVENT_P = 0.28;
/** Share of events that are spikes rather than dips. */
const FLICKER_SPIKE_P = 0.22;
/** Share of dips that stutter (dip - brief recovery - dip). */
const FLICKER_DOUBLE_P = 0.45;
export const FLICKER_SPIKE_VALUE = 1.15;

type FlickerEvent = {
  start: number;
  end: number;
  value: number;
  double: boolean;
};

function mix32(input: number): number {
  let x = input >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Deterministic uniform in [0, 1) for (seed, window, draw index). */
function uniform(seed: number, window: number, draw: number): number {
  const base = mix32((seed | 0) + Math.imul(window | 0, 0x9e3779b1));
  return mix32(base + Math.imul(draw + 1, 0x85ebca77)) / 4294967296;
}

function eventForWindow(seed: number, window: number): FlickerEvent | null {
  // The first second stays steady so the hero never flickers on first paint.
  if (window < 1) return null;
  if (uniform(seed, window, 0) >= FLICKER_EVENT_P) return null;
  const start =
    window * FLICKER_WINDOW + uniform(seed, window, 1) * FLICKER_WINDOW;
  const spike = uniform(seed, window, 2) < FLICKER_SPIKE_P;
  const duration = spike
    ? 0.06 + uniform(seed, window, 3) * 0.08 // 60-140 ms
    : 0.08 + uniform(seed, window, 3) * 0.12; // 80-200 ms
  const value = spike
    ? FLICKER_SPIKE_VALUE
    : 0.6 + uniform(seed, window, 4) * 0.25;
  const double = !spike && uniform(seed, window, 5) < FLICKER_DOUBLE_P;
  return { start, end: start + duration, value, double };
}

function sampleEvent(event: FlickerEvent, time: number): number {
  if (time < event.start || time >= event.end) return 1;
  if (event.double) {
    const u = (time - event.start) / (event.end - event.start);
    if (u >= 0.45 && u < 0.6) return 1;
  }
  return event.value;
}

/**
 * Returns `uFlicker(time)` (time in seconds): 1.0 nearly always, with rare 80-200 ms
 * dips to 0.6-0.85 and rarer 60-140 ms spikes to 1.15. The schedule is a pure
 * function of `seed` and `time` (stateless windows), so it is identical across runs
 * and independent of frame rate. Whenever time does not advance between calls (frozen
 * clock / `?still=1`), or on the very first call, it returns exactly 1.0.
 */
export function makeFlicker(seed: number): (time: number) => number {
  let lastTime = Number.NaN;
  return (time: number): number => {
    if (!(time > lastTime)) {
      if (Number.isFinite(time)) lastTime = time;
      return 1;
    }
    lastTime = time;
    const window = Math.floor(time / FLICKER_WINDOW);
    for (let w = window; w >= window - 1; w -= 1) {
      const event = eventForWindow(seed, w);
      if (event) {
        const value = sampleEvent(event, time);
        if (value !== 1) return value;
      }
    }
    return 1;
  };
}

// ---------------------------------------------------------------------------
// Self-check
// ---------------------------------------------------------------------------

export type NeonSelfTest = {
  ok: boolean;
  /** Largest corner error (CSS px) across the homography cases. */
  maxError: number;
  failures: string[];
};

/** Parses a `matrix3d(...)` string into its 16 column-major values. */
export function parseMatrix3d(css: string): number[] | null {
  const match = /^matrix3d\(([^)]*)\)$/.exec(css.trim());
  if (!match) return null;
  const values = match[1].split(',').map((part) => Number(part.trim()));
  if (values.length !== 16 || values.some((v) => !Number.isFinite(v)))
    return null;
  return values;
}

/** Applies a column-major CSS matrix3d to the point (x, y, 0, 1) with perspective divide. */
export function applyMatrix3d(
  m: readonly number[],
  x: number,
  y: number,
): [number, number] {
  const px = m[0] * x + m[4] * y + m[12];
  const py = m[1] * x + m[5] * y + m[13];
  const pw = m[3] * x + m[7] * y + m[15];
  return [px / pw, py / pw];
}

/**
 * Maps the element box corners through the matrix produced by `quadToMatrix3d` for a
 * handful of view/zoom/offset/quad combinations and checks that they land on the
 * cover-fitted target points within 0.5 px. Also sanity-checks `lerpQuad` and
 * `makeFlicker`. Never throws; inspect `ok` / `failures`.
 */
export function _selfTest(): NeonSelfTest {
  const failures: string[] = [];
  let maxError = 0;

  type Case = {
    name: string;
    quad: Quad;
    plate: [number, number];
    view: [number, number];
    zoom: number;
    offset: [number, number];
    elem: [number, number];
  };

  const cases: Case[] = [
    {
      name: 'hero desktop',
      quad: [
        [0.4125, 0.2125],
        [0.582, 0.2194],
        [0.5867, 0.2917],
        [0.4117, 0.2736],
      ],
      plate: [1280, 720],
      view: [1440, 900],
      zoom: 1,
      offset: [0, 0],
      elem: [440, 120],
    },
    {
      name: 'tilted plate 7 on phone',
      quad: [
        [0.3828, 0.2583],
        [0.4852, 0.2444],
        [0.4859, 0.2931],
        [0.3703, 0.3167],
      ],
      plate: [1280, 720],
      view: [375, 812],
      zoom: 1.03,
      offset: [0.02, -0.01],
      elem: [300, 80],
    },
    {
      name: 'strong perspective, zoom + pan',
      quad: [
        [0.2, 0.2],
        [0.6, 0.25],
        [0.55, 0.5],
        [0.22, 0.45],
      ],
      plate: [1600, 900],
      view: [1920, 1080],
      zoom: 1.06,
      offset: [-0.03, 0.02],
      elem: [512, 160],
    },
    {
      name: 'ultrawide, axis-aligned quad',
      quad: [
        [0.3, 0.3],
        [0.5, 0.3],
        [0.5, 0.4],
        [0.3, 0.4],
      ],
      plate: [1280, 720],
      view: [3440, 1440],
      zoom: 1.02,
      offset: [0, 0],
      elem: [640, 200],
    },
  ];

  for (const c of cases) {
    const css = quadToMatrix3d(
      c.quad,
      c.plate[0],
      c.plate[1],
      c.view[0],
      c.view[1],
      c.zoom,
      c.offset,
      c.elem[0],
      c.elem[1],
    );
    const m = parseMatrix3d(css);
    if (!m) {
      failures.push(`${c.name}: unparseable matrix "${css}"`);
      continue;
    }
    const expected = quadToScreen(
      c.quad,
      c.plate[0],
      c.plate[1],
      c.view[0],
      c.view[1],
      c.zoom,
      c.offset,
    );
    const corners: [number, number][] = [
      [0, 0],
      [c.elem[0], 0],
      [c.elem[0], c.elem[1]],
      [0, c.elem[1]],
    ];
    corners.forEach((corner, i) => {
      const [x, y] = applyMatrix3d(m, corner[0], corner[1]);
      const error = Math.hypot(x - expected[i][0], y - expected[i][1]);
      if (!Number.isFinite(error)) {
        failures.push(`${c.name}: corner ${String(i)} is not finite`);
        return;
      }
      maxError = Math.max(maxError, error);
      if (error > 0.5) {
        failures.push(
          `${c.name}: corner ${String(i)} off by ${error.toFixed(3)} px (got ${x.toFixed(2)},${y.toFixed(2)} want ${expected[i][0].toFixed(2)},${expected[i][1].toFixed(2)})`,
        );
      }
    });
  }

  // Degenerate input must still produce a finite, parseable matrix.
  const degenerate = quadToMatrix3d(
    cases[0].quad,
    1280,
    720,
    1440,
    900,
    1,
    [0, 0],
    0,
    0,
  );
  if (!parseMatrix3d(degenerate))
    failures.push(`degenerate box produced "${degenerate}"`);

  // lerpQuad endpoints and midpoint.
  const a = cases[0].quad;
  const b = cases[2].quad;
  const at0 = lerpQuad(a, b, 0);
  const at1 = lerpQuad(a, b, 1);
  const mid = lerpQuad(a, b, 0.5);
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      const idx = i as 0 | 1 | 2 | 3;
      const jdx = j as 0 | 1;
      if (at0[idx][jdx] !== a[idx][jdx] || at1[idx][jdx] !== b[idx][jdx]) {
        failures.push('lerpQuad endpoints do not match inputs');
      }
      const want = (a[idx][jdx] + b[idx][jdx]) / 2;
      if (Math.abs(mid[idx][jdx] - want) > 1e-12)
        failures.push('lerpQuad midpoint is wrong');
    }
  }

  // Flicker: deterministic per seed, bounded, frozen time -> 1, and actually fires.
  const f1 = makeFlicker(7);
  const f2 = makeFlicker(7);
  let events = 0;
  let sameSeedMismatch = false;
  for (let i = 0; i <= 60 * 120; i += 1) {
    const t = i / 120;
    const v1 = f1(t);
    const v2 = f2(t);
    if (v1 !== v2) sameSeedMismatch = true;
    if (v1 !== 1) {
      events += 1;
      if (v1 < 0.6 || (v1 > 0.85 && v1 !== FLICKER_SPIKE_VALUE)) {
        failures.push(
          `flicker value ${String(v1)} out of range at t=${String(t)}`,
        );
      }
    }
  }
  if (sameSeedMismatch)
    failures.push('flicker is not deterministic for the same seed');
  if (events === 0) failures.push('flicker never fired in 60 s');
  const frozen = makeFlicker(7);
  frozen(4.2);
  if (frozen(4.2) !== 1 || frozen(4.2) !== 1)
    failures.push('frozen time did not return 1.0');
  if (makeFlicker(3)(0) !== 1) failures.push('first call did not return 1.0');

  return { ok: failures.length === 0, maxError, failures };
}
