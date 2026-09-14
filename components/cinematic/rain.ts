/**
 * 2D streak rain for the photoreal cinematic (docs/photoreal-spec.md, layer 3).
 *
 * - `density` streaks (spec: 220 desktop / 90 mobile) split across three depth bands:
 *   far (short / dim / slow), mid, near (long / bright / fast). At rest: length 18-70 px,
 *   speed 900-1900 px/s, alpha 0.08-0.28, all streaks lean by -6 degrees.
 * - `setSpeed(0..1)` is the car's drive speed. It steers the lean from -6 deg (rest) to
 *   +38 deg (top speed), stretches the streaks up to 2.6x and brightens them up to 1.25x,
 *   so the rain reads as motion once the car is moving (see {@link leanRadians} for the
 *   sign convention).
 * - Streaks are drawn far-to-near as tapered lines (transparent tail -> bright head)
 *   with one cached gradient per band; the canvas is expected to sit on top of the
 *   compositor with `mix-blend-mode: screen`.
 * - Canvas state churn is bounded: the draw order groups streaks by band and, within a
 *   band, by one of {@link ALPHA_BUCKETS} alpha levels, so lineWidth / strokeStyle change
 *   once per band and globalAlpha once per band x bucket, never per streak.
 * - Positions are stored normalised to the viewport, so `resize()` never reshuffles
 *   the field; it only re-scales it. Wrap at the bottom (and at the side edge the lean
 *   drifts toward).
 * - Device pixel ratio is capped at 1.5.
 * - `still` (or `prefers-reduced-motion`) freezes the field: one deterministic frame
 *   is drawn from the seeded PRNG and `step()` becomes a no-op until the next resize
 *   or `setSpeed()` change (so a still screenshot at drive progress shows the drive lean).
 */

export type RainOptions = {
  /** Number of streaks. */
  density: number;
  /** Freeze time-based motion (screenshot mode). */
  still: boolean;
  /** Seed for the PRNG; the default gives a fixed field for `still` screenshots. */
  seed?: number;
};

export type Rain = {
  /** Re-read the canvas size / DPR and redraw. Call from the host's resize handler. */
  resize(): void;
  /** Advance by `dt` seconds and draw. No-op (after the first frame) when still. */
  step(dt: number): void;
  /** Drive speed 0..1 (clamped). Steers the lean, streak length and brightness. */
  setSpeed(s: number): void;
  /** Clear the canvas and stop responding to `resize` / `step` / `setSpeed`. */
  dispose(): void;
};

type Band = {
  /** Fraction of `density` assigned to this band. */
  share: number;
  length: readonly [number, number];
  speed: readonly [number, number];
  alpha: readonly [number, number];
  width: number;
};

export const RAIN_DPR_CAP = 1.5;
/** Lean at rest (speed 0), degrees. */
export const RAIN_LEAN_DEG = -6;
/** Extra lean at full speed, degrees: -6 + 44 = +38 deg at speed 1. */
export const RAIN_LEAN_SPEED_DEG = 44;
/** Streak length multiplier at full speed is 1 + this. */
const LENGTH_SPEED_GAIN = 1.6;
/** Alpha multiplier at full speed is 1 + this. */
const ALPHA_SPEED_GAIN = 0.25;
/** Alpha levels per band; strokes in the same bucket share one globalAlpha. */
const ALPHA_BUCKETS = 3;
const DEFAULT_SEED = 0x2f6b1;
/** Largest simulation step; protects against a huge jump after a background tab. */
const MAX_DT = 0.1;

/** Far -> near. Drawn in this order so near streaks paint on top. */
const BANDS: readonly Band[] = [
  {
    share: 0.45,
    length: [18, 32],
    speed: [900, 1200],
    alpha: [0.08, 0.14],
    width: 1,
  },
  {
    share: 0.35,
    length: [30, 50],
    speed: [1150, 1550],
    alpha: [0.12, 0.2],
    width: 1.25,
  },
  {
    share: 0.2,
    length: [48, 70],
    speed: [1500, 1900],
    alpha: [0.18, 0.28],
    width: 1.6,
  },
];

/** Cool, slightly blue-white so the screen blend reads as rain, not snow. */
const TINT = '222, 231, 242';

/** mulberry32 - small, fast, deterministic 32-bit PRNG returning [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function lerp(range: readonly [number, number], t: number): number {
  return range[0] + (range[1] - range[0]) * t;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Lean of the fall direction for a drive speed, in radians.
 *
 * Sign convention (screen space, y down): the fall direction is (sin lean, cos lean)
 * and each streak is drawn tail -> head along it, so a positive lean puts the head
 * (the bottom end) to the RIGHT of the tail, i.e. top-left -> bottom-right, a positive
 * x drift with y. The car drives LEFT, so relative to the camera tracking it the rain
 * drifts RIGHT as it falls; the lean therefore grows with speed: -6 deg at rest (the
 * spec's slight top-right -> bottom-left lean) to +38 deg at speed 1.
 */
function leanRadians(speed: number): number {
  return ((RAIN_LEAN_DEG + RAIN_LEAN_SPEED_DEG * speed) * Math.PI) / 180;
}

function bandForIndex(index: number, count: number): number {
  const position = (index + 0.5) / count;
  let cumulative = 0;
  for (let b = 0; b < BANDS.length; b += 1) {
    cumulative += BANDS[b].share;
    if (position < cumulative) return b;
  }
  return BANDS.length - 1;
}

/** Centre of alpha bucket `bucket` within band `b`'s alpha range. */
function bucketAlpha(b: number, bucket: number): number {
  return lerp(BANDS[b].alpha, (bucket + 0.5) / ALPHA_BUCKETS);
}

/** Gradient in streak-local space: tail at (0,-1) fully transparent, head at (0,0). */
function makeGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, -1, 0, 0);
  gradient.addColorStop(0, `rgba(${TINT}, 0)`);
  gradient.addColorStop(0.55, `rgba(${TINT}, 0.45)`);
  gradient.addColorStop(1, `rgba(${TINT}, 1)`);
  return gradient;
}

const NOOP_RAIN: Rain = {
  resize: () => undefined,
  step: () => undefined,
  setSpeed: () => undefined,
  dispose: () => undefined,
};

export function createRain(canvas: HTMLCanvasElement, opts: RainOptions): Rain {
  const ctx = canvas.getContext('2d', { alpha: true });
  const count = Math.max(0, Math.floor(opts.density));
  if (!ctx || count === 0) return NOOP_RAIN;

  const still = opts.still || prefersReducedMotion();
  const rng = mulberry32(opts.seed ?? DEFAULT_SEED);

  // Structure-of-arrays streak state. x/t are normalised (0..1) to the wrap period.
  // `lengths` is the rest length; the drawn length is lengths[i] * lengthScale.
  const band = new Uint8Array(count);
  const bucket = new Uint8Array(count);
  const xs = new Float32Array(count);
  const ts = new Float32Array(count);
  const lengths = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const b = bandForIndex(i, count);
    const spec = BANDS[b];
    band[i] = b;
    xs[i] = rng();
    ts[i] = rng();
    lengths[i] = lerp(spec.length, rng());
    speeds[i] = lerp(spec.speed, rng());
    // Alpha is quantised to ALPHA_BUCKETS levels spread evenly over the band's range
    // (see bucketAlpha); the spread is within +-1/6 of the range, invisible on screen.
    bucket[i] = Math.min(ALPHA_BUCKETS - 1, Math.floor(rng() * ALPHA_BUCKETS));
  }

  // Draw order: far -> near band, then alpha bucket, so consecutive strokes share
  // canvas state and the number of state changes per frame is bounded by
  // BANDS.length * ALPHA_BUCKETS instead of `count`.
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) order[i] = i;
  order.sort((p, q) => {
    const byBand = band[p] - band[q];
    return byBand !== 0 ? byBand : bucket[p] - bucket[q];
  });

  const gradients = BANDS.map(() => makeGradient(ctx));

  let width = 1;
  let height = 1;
  let dpr = 1;
  let speed = 0;
  let disposed = false;
  let dirty = true;

  // Basis derived from `speed` once per frame (see leanRadians for the sign
  // convention). Unit fall direction (dirX, dirY) in screen space, y down.
  let dirX = 0;
  let dirY = 1;
  let absDirX = 0;
  let lengthScale = 1;
  let alphaScale = 1;

  const derive = () => {
    const lean = leanRadians(speed);
    dirX = Math.sin(lean);
    dirY = Math.cos(lean);
    absDirX = Math.abs(dirX);
    lengthScale = 1 + LENGTH_SPEED_GAIN * speed;
    alphaScale = 1 + ALPHA_SPEED_GAIN * speed;
  };

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'butt';

    let currentBand = -1;
    let currentBucket = -1;
    for (let k = 0; k < count; k += 1) {
      const i = order[k];
      const b = band[i];
      if (b !== currentBand) {
        currentBand = b;
        currentBucket = -1;
        ctx.lineWidth = BANDS[b].width;
        ctx.strokeStyle = gradients[b];
      }
      if (bucket[i] !== currentBucket) {
        currentBucket = bucket[i];
        ctx.globalAlpha = Math.min(1, bucketAlpha(b, currentBucket) * alphaScale);
      }

      const len = lengths[i] * lengthScale;
      const marginX = len * absDirX;
      // Head position. The tail sits `len` px behind the head, on the side the lean
      // comes from, so the x period is (width + margin) offset such that a streak has
      // fully cleared the edge it drifts toward before it wraps: with dirX < 0 the
      // head runs over [-margin, width), with dirX > 0 over [0, width + margin).
      // The y period is (height + projected length) so the streak is entirely above
      // the top at t=0 and entirely below the bottom at t=1.
      const headX = xs[i] * (width + marginX) - (dirX < 0 ? marginX : 0);
      const headY = ts[i] * (height + len * dirY);

      // Local basis: x = unit perpendicular (keeps lineWidth in px), y = fall direction
      // scaled by length, so the line (0,-1) -> (0,0) is the tail -> head segment.
      ctx.setTransform(
        dirY * dpr,
        -dirX * dpr,
        dirX * len * dpr,
        dirY * len * dpr,
        headX * dpr,
        headY * dpr,
      );
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(0, 0);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    dirty = false;
  };

  const advance = (dt: number) => {
    for (let i = 0; i < count; i += 1) {
      const len = lengths[i] * lengthScale;
      const travel = speeds[i] * dt;
      let t = ts[i] + travel / (height + len * dirY);
      if (t >= 1) t -= Math.floor(t);
      ts[i] = t;
      let x = xs[i] + (dirX * travel) / (width + len * absDirX);
      x -= Math.floor(x);
      xs[i] = x;
    }
  };

  const resize = () => {
    if (disposed) return;
    const cssWidth = canvas.clientWidth || window.innerWidth;
    const cssHeight = canvas.clientHeight || window.innerHeight;
    width = Math.max(1, cssWidth);
    height = Math.max(1, cssHeight);
    dpr = Math.min(RAIN_DPR_CAP, Math.max(1, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    dirty = true;
    derive();
    draw();
  };

  const step = (dt: number) => {
    if (disposed) return;
    derive();
    if (still) {
      if (dirty) draw();
      return;
    }
    const clamped = Math.min(MAX_DT, Math.max(0, Number.isFinite(dt) ? dt : 0));
    if (clamped > 0) advance(clamped);
    draw();
  };

  const setSpeed = (s: number) => {
    if (disposed) return;
    const next = clamp01(s);
    if (next === speed) return;
    speed = next;
    // A still field is redrawn on the next step() so it shows the new lean.
    dirty = true;
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  resize();
  return { resize, step, setSpeed, dispose };
}
