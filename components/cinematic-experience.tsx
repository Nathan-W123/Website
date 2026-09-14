'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createCompositor,
  ZERO_QUAD,
  type Compositor,
} from './cinematic/compositor';
import {
  NEON_BOX_UNITS,
  NEON_GLYPHS,
  NEON_KEYFRAMES,
  PLATE_HEIGHT,
  PLATE_WIDTH,
  PROJECTS,
  type NeonKeyframe,
} from './cinematic/keyframes';
import { lerpQuad, makeFlicker, quadToMatrix3d } from './cinematic/neon';
import { loadPlates, type PlateSet } from './cinematic/plates';
import { createRain } from './cinematic/rain';

/* Timeline (progress p in [0,1]) — see docs/photoreal-spec.md. */
const ORBIT_START = 0.03;
const ORBIT_END = 0.42;
/**
 * Orbit plates in display order. Plate 9 swings back to a 3/4 view between the near-side
 * plate 8 and the side plate 10, so it is left out; every orbit lookup (plates and neon
 * keyframes) goes through this table.
 */
const ORBIT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10] as const;
/** Last position in ORBIT_ORDER (plate 10). */
const ORBIT_LAST_PLATE = ORBIT_ORDER.length - 1;
/** Virtual orbit position ORBIT_STEPS is drive frame 0 (== old frame-11): the bridge crossfade. */
const ORBIT_STEPS = ORBIT_ORDER.length;
/**
 * Each orbit dissolve reads as camera motion: the outgoing plate keeps pushing in while the
 * incoming plate arrives from slightly wider, both by this fraction of the global zoom.
 */
const DISSOLVE_ZOOM = 0.012;
/**
 * Bridge geometry. Drive frame 0 is the same side-on shot as orbit plate 10, but its car is
 * ~9 % smaller and sits slightly right and low, so a plain crossfade ghosts two cars. Measured
 * on the wheel-hub centres (plate px): orbit 10 front (275.3, 405), rear (971, 408); drive 0
 * front (399.5, 510.5), rear (1191.3, 509.5). BRIDGE_ZOOM is the wheelbase ratio
 * (0.5435 / 0.4949 of plate width) and BRIDGE_PAN the pan that puts the drive car's hubs on
 * the orbit car's, as a fraction of the cover-fitted plate size (turned into the compositor's
 * view-fraction offset per frame by coverPanToOffset). The drive plates carry both through the
 * bridge crossfade and ease them back to neutral over the first BRIDGE_SETTLE of the drive.
 */
const BRIDGE_ZOOM = 1.098;
const BRIDGE_PAN: readonly [number, number] = [-0.01, -0.0086];
const BRIDGE_SETTLE = 0.12;
/**
 * Narrow (portrait) viewports cover-fit only the middle ~26 % of a drive plate, a door panel.
 * The drive plates are panned so the view centres on plate x = 0.5 + MOBILE_DRIVE_PAN (rear
 * wheel left of centre, sill end at the left edge, tail lamp at the right edge), ramped in
 * together with the window-track.
 */
const MOBILE_DRIVE_PAN = 0.26;
/**
 * Narrow viewports also cover-fit only the middle of an orbit plate, which cuts the neon sign
 * at the left edge once the text drifts left (plates 3-8). The orbit view therefore pans to
 * centre on the lerped keyframe quad, by at most this fraction of the cover-fitted plate
 * width, ramped in over ORBIT_PAN_IN (plate 0's text is centred, so the hero never moves)
 * and back out over ORBIT_PAN_OUT, which ends before the window-track and MOBILE_DRIVE_PAN
 * begin at p = 0.41. It is a pure view translation applied to both compositor slots, so the
 * bridge alignment of plate 10 and drive frame 0 is untouched.
 */
const ORBIT_PAN_MAX = 0.14;
const ORBIT_PAN_IN: readonly [number, number] = [0.03, 0.12];
const ORBIT_PAN_OUT: readonly [number, number] = [0.3, 0.41];
/**
 * Drive frames are graded hotter than the orbit plates: their sill neon and the road hotspot
 * under the car are 2-3x brighter than plate 10's at the seam. The compositor dims those
 * (bright pixels in the lower part of a drive frame) by DRIVE_DIM x settle, so the underglow
 * lights up as the car pulls away instead of popping at the cut.
 */
const DRIVE_DIM = 0.4;
/**
 * The neon overlay is the NEON_BOX_UNITS SVG box (the keyframe quad's frame, ~1 unit per plate
 * pixel on plate 0) laid out at 3x in CSS px and mapped onto the quad with matrix3d. The CSS
 * for .neon-sign must use the same 660x150 px box.
 */
const NEON_BOX_SCALE = 3;
const NEON_BOX_WIDTH = NEON_BOX_UNITS[0] * NEON_BOX_SCALE;
const NEON_BOX_HEIGHT = NEON_BOX_UNITS[1] * NEON_BOX_SCALE;
const TOP_SPEED = 268;
const MOBILE_BREAKPOINT = 760;
const MAX_DPR = 1.5;
const FLICKER_SEED = 7;
const NO_OFFSET: [number, number] = [0, 0];
/** Drive frames warmed (decode()) ahead of the current one, in the scrub direction. */
const DECODE_LOOKAHEAD = 2;
const WHEEL_GAIN = 0.00045;
const WHEEL_MAX_DELTA = 120;
const TOUCH_GAIN = 0.0009;
const KEY_STEP = 0.055;

type Phase = 'READY' | 'CAMERA ORBIT' | 'DRIVING' | 'BUFFERING';
type LoadStage = 'orbit' | 'drive';

type FramePick = {
  a: HTMLImageElement | null;
  b: HTMLImageElement | null;
  mix: number;
  /** Every plate this frame needs is loaded (drives `data-ready`). */
  complete: boolean;
  /** A drive frame that is needed has not arrived yet. */
  buffering: boolean;
  /** Base drive frame index while driving, -1 otherwise (decode look-ahead). */
  driveIndex: number;
  /** Slot A holds a drive frame (gets the bridge / mobile drive geometry). */
  aDrive: boolean;
  /** Slot B holds a drive frame: the bridge's incoming frame 0 or the next drive frame. */
  bDrive: boolean;
  /** Neon keyframe of the orbit plate in slot A / B; null for a drive frame or an empty slot. */
  keyA: NeonKeyframe | null;
  keyB: NeonKeyframe | null;
};

/** Quad passed to the compositor for a slot: the orbit plate's keyframe quad, or none. */
const slotQuad = (key: NeonKeyframe | null) => key?.quad ?? ZERO_QUAD;
/**
 * Baked-text suppression strength for a slot: full for every orbit plate the overlay is
 * drawn on (keyframe opacity > 0), none for plate 10 (no baked text) and drive frames.
 */
const slotKill = (key: NeonKeyframe | null) =>
  key !== null && key.opacity > 0 ? 1 : 0;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (start: number, end: number, value: number) => {
  const x = clamp((value - start) / (end - start));
  return x * x * (3 - 2 * x);
};
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
/**
 * Converts a pan given as a fraction of the cover-fitted plate (the units the bridge and mobile
 * pans are measured in) into the compositor's offset, a fraction of the view, for a
 * `plateW x plateH` plate drawn at `zoom`. Mirrors the scale in coverFit().
 */
const coverPanToOffset = (
  pan: readonly [number, number],
  plateW: number,
  plateH: number,
  viewW: number,
  viewH: number,
  zoom: number,
): [number, number] => {
  const scale = Math.max(viewW / plateW, viewH / plateH) * zoom;
  return [(pan[0] * plateW * scale) / viewW, (pan[1] * plateH * scale) / viewH];
};
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Faint neon buzz: an opacity dip to 0.96–1.0 roughly every 2 s, seeded so it is deterministic. */
const neonBuzz = (time: number) => {
  const period = 2;
  const cycle = Math.floor(time / period);
  const local = time - cycle * period;
  const start = 0.4 + hash(cycle) * 1.2;
  const duration = 0.06 + hash(cycle + 101) * 0.1;
  if (local > start && local < start + duration)
    return 0.96 + 0.04 * hash(cycle + 7);
  return 1;
};

export function CinematicExperience() {
  const shellRef = useRef<HTMLElement>(null);
  const plateCanvasRef = useRef<HTMLCanvasElement>(null);
  const rainCanvasRef = useRef<HTMLCanvasElement>(null);
  const neonRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const speedRef = useRef<HTMLSpanElement>(null);
  const loaderBarRef = useRef<HTMLElement>(null);
  const loaderValueRef = useRef<HTMLSpanElement>(null);
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);
  const [activeProject, setActiveProject] = useState(0);
  const [phase, setPhase] = useState<Phase>('READY');
  const [orbitReady, setOrbitReady] = useState(false);
  const [loadDone, setLoadDone] = useState(false);
  const [failed, setFailed] = useState(false);

  /* Input: wheel / touch / keyboard drive the target progress; the page itself never scrolls. */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const pushProgress = (amount: number) => {
      targetProgress.current = clamp(targetProgress.current + amount);
    };

    const handleWheel = (event: WheelEvent) => {
      // Leave browser zoom (ctrl/cmd + wheel) and other modified gestures alone.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      // deltaMode: 0 = pixels, 1 = lines, 2 = pages.
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      const dy = event.deltaY * unit;
      pushProgress(
        Math.sign(dy) * Math.min(Math.abs(dy), WHEEL_MAX_DELTA) * WHEEL_GAIN,
      );
    };

    let touchY = 0;
    const handleTouchStart = (event: TouchEvent) => {
      // Two fingers is a pinch-zoom: let the browser have it.
      if (event.touches.length > 1) return;
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) return;
      event.preventDefault();
      const nextY = event.touches[0]?.clientY ?? touchY;
      pushProgress((touchY - nextY) * TOUCH_GAIN);
      touchY = nextY;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      // After a pinch, re-anchor on the finger that is still down so the next move does not jump.
      touchY = event.touches[0]?.clientY ?? touchY;
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (['ArrowDown', 'PageDown', ' ', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        pushProgress(KEY_STEP);
      }
      if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        pushProgress(-KEY_STEP);
      }
      if (event.key === 'Home') targetProgress.current = 0;
      if (event.key === 'End') targetProgress.current = 1;
    };

    document.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKey);

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      document.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  /* Scene: plates, compositor, rain, neon overlay, window-cards, HUD. */
  useEffect(() => {
    const shell = shellRef.current;
    const plateCanvas = plateCanvasRef.current;
    const rainCanvas = rainCanvasRef.current;
    const neon = neonRef.current;
    const track = trackRef.current;
    if (!shell || !plateCanvas || !rainCanvas || !neon || !track) return;

    // URL parameters: ?p=0.55 (initial progress, no easing) and ?still=1 (freeze time-based effects).
    const params = new URLSearchParams(window.location.search);
    const requested = Number.parseFloat(params.get('p') ?? '');
    if (Number.isFinite(requested)) {
      const initial = clamp(requested);
      targetProgress.current = initial;
      currentProgress.current = initial;
    }
    const stillParam = params.get('still') === '1';
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const still = stillParam || reducedMotion;
    if (still) shell.dataset.still = '1';
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    let compositor: Compositor | null = null;
    try {
      compositor = createCompositor(plateCanvas);
    } catch {
      compositor = null;
    }
    // Reported from the first animation frame rather than synchronously in the effect body.
    let compositorMissing = compositor === null;

    const rain = createRain(rainCanvas, {
      density: isMobile ? 90 : 220,
      still,
    });
    const flickerAt = makeFlicker(FLICKER_SEED);
    const grain = reducedMotion ? 0 : 0.045;

    // The neon glow (the stylesheet's filter chain on .neon-sign) must not sit on the element
    // that carries the perspective matrix3d: after some layer-tree changes (the loader being
    // removed) Chrome composites a filtered, 3D-transformed will-change layer from tiles
    // rasterised at the wrong scale and the sign turns into two giant glyphs (reproduced in
    // headless Chrome on SwiftShader). A filter on a child of the transformed element is
    // stable, so the chain is moved down to the SVG. It has to happen after the element has
    // its first transform: a filter layer created untransformed is rastered at scale 1 and,
    // under will-change, never re-rastered. A no-op once the stylesheet itself targets the SVG.
    const neonSvg = neon.querySelector('svg');
    let neonFilterMoved = false;
    const moveNeonFilter = () => {
      neonFilterMoved = true;
      const chain = getComputedStyle(neon).filter;
      if (!neonSvg || chain === '' || chain === 'none') return;
      neon.style.filter = 'none';
      neonSvg.style.filter = chain;
    };

    // Plates.
    let orbit: PlateSet | null = null;
    let drive: PlateSet | null = null;
    let driveReady: () => number = () => 0;
    const abort = new AbortController();
    let shownFraction = -1;
    let shownPercent = -1;
    let orbitFlagged = false;
    let doneFlagged = false;

    const flagOrbitReady = () => {
      if (orbitFlagged) return;
      orbitFlagged = true;
      setOrbitReady(true);
    };
    const flagDone = () => {
      if (doneFlagged) return;
      doneFlagged = true;
      setLoadDone(true);
      // Every plate is decoded: screenshot tooling waits for this before capturing.
      document.documentElement.dataset.loaded = '1';
    };
    // plates.ts reports one monotonic overall fraction (orbit 0 -> 0.4, drive 0.4 -> 1).
    // The loader bar and percent are written straight to the DOM; only "done" is React state.
    const reportProgress = (rawFraction: number, stage: LoadStage) => {
      if (abort.signal.aborted) return;
      const fraction = clamp(rawFraction);
      if (fraction > shownFraction) {
        shownFraction = fraction;
        const bar = loaderBarRef.current;
        if (bar) bar.style.transform = `scaleX(${fraction.toFixed(4)})`;
        const percent = Math.round(fraction * 100);
        if (percent > shownPercent) {
          shownPercent = percent;
          const value = loaderValueRef.current;
          if (value) value.textContent = `${String(percent)}%`;
        }
      }
      if (stage === 'drive') flagOrbitReady();
      if (fraction >= 1) flagDone();
    };

    loadPlates(reportProgress, abort.signal)
      .then((sets) => {
        if (abort.signal.aborted) return;
        orbit = sets.orbit;
        drive = sets.drive;
        driveReady = sets.driveReady;
        flagOrbitReady();
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });

    // Sizing.
    const view = { width: 1, height: 1 };
    const resize = () => {
      view.width = Math.max(1, shell.clientWidth);
      view.height = Math.max(1, shell.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      compositor?.resize(view.width, view.height, dpr);
      rain.resize();
    };
    resize();
    window.addEventListener('resize', resize);

    /** Choose the two plates to blend for this frame (orbit crossfade, bridge, or drive pair). */
    const pickFrame = (
      orbitT: number,
      driving: boolean,
      driveEase: number,
    ): FramePick => {
      if (!orbit)
        return {
          a: null,
          b: null,
          mix: 0,
          complete: false,
          buffering: driving,
          driveIndex: -1,
          aDrive: false,
          bDrive: false,
          keyA: null,
          keyB: null,
        };
      const ready = driveReady();

      if (!driving) {
        const f = orbitT * ORBIT_STEPS;
        const i0 = Math.min(Math.floor(f), ORBIT_LAST_PLATE);
        const i1 = i0 + 1;
        const t = f - i0;
        const needB = t > 0.0005;
        const plateA = ORBIT_ORDER[i0];
        const a = orbit.images[plateA] ?? null;
        const bridge = i1 > ORBIT_LAST_PLATE;
        const candidate = bridge
          ? ready > 0
            ? (drive?.images[0] ?? null)
            : null
          : (orbit.images[ORBIT_ORDER[i1]] ?? null);
        const b = needB ? candidate : null;
        const missing = needB && !candidate;
        return {
          a,
          b,
          // Orbit dissolves are steeper than linear so the double-exposure window is short.
          // The bridge (plate 10 -> drive frame 0, hubs aligned by BRIDGE_ZOOM / BRIDGE_PAN)
          // is linear over its whole interval so it ends exactly as DRIVING begins.
          mix: b ? (bridge ? t : smoothstep(0.3, 0.7, t)) : 0,
          complete: a !== null && !missing,
          buffering: missing && bridge,
          driveIndex: -1,
          aDrive: false,
          bDrive: bridge && b !== null,
          keyA: NEON_KEYFRAMES[plateA] ?? null,
          keyB: b && !bridge ? (NEON_KEYFRAMES[ORBIT_ORDER[i1]] ?? null) : null,
        };
      }

      if (!drive || ready <= 0) {
        return {
          a: orbit.images[ORBIT_ORDER[ORBIT_LAST_PLATE]] ?? null,
          b: null,
          mix: 0,
          complete: false,
          buffering: true,
          driveIndex: -1,
          aDrive: false,
          bDrive: false,
          keyA: NEON_KEYFRAMES[ORBIT_ORDER[ORBIT_LAST_PLATE]] ?? null,
          keyB: null,
        };
      }
      const last = drive.count - 1;
      const loadedMax = Math.min(ready - 1, last);
      const g = driveEase * last;
      const buffering = g > loadedMax + 0.0005;
      const gc = Math.min(g, loadedMax);
      const j0 = Math.floor(gc);
      const j1 = Math.min(j0 + 1, loadedMax);
      const t = gc - j0;
      const needB = t > 0.0005 && j1 !== j0;
      const a = drive.images[j0] ?? null;
      const b = needB ? (drive.images[j1] ?? null) : null;
      return {
        a,
        b,
        mix: b ? t : 0,
        complete: a !== null && !buffering && (!needB || b !== null),
        buffering,
        driveIndex: j0,
        aDrive: true,
        bDrive: b !== null,
        keyA: null,
        keyB: null,
      };
    };

    // Decode look-ahead: warm the next frames in the scrub direction so a bitmap the browser
    // has evicted from its decode cache is back before the compositor asks for it.
    let lookaheadDirection = 0;
    const lookaheadRequested = new Set<number>();
    const warmDriveFrames = (from: number, direction: number) => {
      if (!drive) return;
      if (direction !== lookaheadDirection) {
        lookaheadDirection = direction;
        lookaheadRequested.clear();
      }
      const last = drive.count - 1;
      for (let step = 1; step <= DECODE_LOOKAHEAD; step += 1) {
        const j = from + direction * step;
        if (j < 0 || j > last || lookaheadRequested.has(j)) continue;
        const image = drive.images[j];
        if (!image) continue;
        lookaheadRequested.add(j);
        void image.decode().catch(() => undefined);
      }
    };

    // Render loop.
    let disposed = false;
    let frame = 0;
    const startedAt = performance.now();
    let lastAt = startedAt;
    let previousPhase: Phase | '' = '';
    let previousActive = -1;
    let previousSpeed = -1;
    let previousSequence = '';
    let composited = false;
    let readyFlagged = false;
    const cardHidden: boolean[] = PROJECTS.map(() => false);

    const loop = (now: number) => {
      if (disposed) return;
      if (compositorMissing) {
        compositorMissing = false;
        setFailed(true);
      }
      const dt = Math.min((now - lastAt) / 1000, 0.05);
      lastAt = now;
      const elapsed = still ? 0 : (now - startedAt) / 1000;

      // Easing toward the target (same feel as before).
      const easing = 1 - Math.exp(-dt * 5.8);
      let p =
        currentProgress.current +
        (targetProgress.current - currentProgress.current) * easing;
      if (Math.abs(targetProgress.current - p) < 0.00002)
        p = targetProgress.current;
      currentProgress.current = p;
      const scrubDirection = targetProgress.current < p ? -1 : 1;

      const orbitT = smoothstep(ORBIT_START, ORBIT_END, p);
      const driving = p >= ORBIT_END;
      const local = driving ? clamp((p - ORBIT_END) / (1 - ORBIT_END)) : 0;
      // Mostly sine so the wheels visibly start turning, with a linear share so the frames
      // advance from the first scroll tick instead of frame 0 sitting frozen after the bridge.
      const driveEase = 0.8 * easeInOutSine(local) + 0.2 * local;
      const speedEase = easeOutCubic(local);

      // One global, slowly increasing zoom: idle push-in blends into the orbit push-in, which
      // continues through the drive, so no crossfade ever pops.
      const idleZoom = still
        ? 1
        : 1 + 0.015 * (1 - Math.cos(elapsed * ((Math.PI * 2) / 12)));
      const orbitZoom = 1.02 + 0.04 * orbitT;
      const idleBlend = smoothstep(0, 0.05, p);
      const zoom = driving
        ? 1.06 + 0.02 * driveEase
        : lerp(idleZoom, orbitZoom, idleBlend);

      // Neon keyframes: the overlay follows the quad and opacity lerped between the two orbit
      // plates on screen. The compositor suppresses both plates' baked texts (kill), so the
      // overlay is the only sign visible and the lerp can run straight through every
      // crossfade (no dip, no snap). In the bridge interval both keys are plate 10 (opacity
      // 0); the drive keeps it off. It also stays off until the first complete composited
      // frame (data-ready) so a cold load never shows it over the poster.
      const plateWidth = orbit?.width ?? PLATE_WIDTH;
      const plateHeight = orbit?.height ?? PLATE_HEIGHT;
      const keyPosition = Math.min(orbitT * ORBIT_STEPS, ORBIT_LAST_PLATE);
      const k0 = Math.floor(keyPosition);
      const k1 = Math.min(k0 + 1, ORBIT_LAST_PLATE);
      const kt = keyPosition - k0;
      const key0 = NEON_KEYFRAMES[ORBIT_ORDER[k0]];
      const key1 = NEON_KEYFRAMES[ORBIT_ORDER[k1]];
      const quad = lerpQuad(key0.quad, key1.quad, kt);
      const keyOpacity = lerp(key0.opacity, key1.opacity, kt);

      // Compositor. Orbit dissolves are zoom-dissolves. The bridge and the drive frames are one
      // shot, so they share a zoom instead (a differential zoom there would ghost the car) and
      // the drive plates carry the bridge correction, which settles once the drive is under way.
      const pick = pickFrame(orbitT, driving, driveEase);
      const trackIn = smoothstep(0.41, 0.47, p);
      const settle = driving ? 1 - smoothstep(0, BRIDGE_SETTLE, local) : 1;
      const narrow = view.width < MOBILE_BREAKPOINT;
      const mobilePan = narrow ? MOBILE_DRIVE_PAN * trackIn : 0;
      // Portrait orbit pan (see ORBIT_PAN_MAX): centre the view on the sign, as a view-fraction
      // offset shared by both slots.
      const quadCentreX =
        (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4;
      const orbitPan = narrow
        ? clamp(0.5 - quadCentreX, -ORBIT_PAN_MAX, ORBIT_PAN_MAX) *
          smoothstep(ORBIT_PAN_IN[0], ORBIT_PAN_IN[1], p) *
          (1 - smoothstep(ORBIT_PAN_OUT[0], ORBIT_PAN_OUT[1], p))
        : 0;
      const orbitOffset =
        orbitPan === 0
          ? NO_OFFSET
          : coverPanToOffset(
              [orbitPan, 0],
              plateWidth,
              plateHeight,
              view.width,
              view.height,
              zoom,
            );
      const driveZoom = lerp(1, BRIDGE_ZOOM, settle);
      const drivePanOffset = coverPanToOffset(
        [BRIDGE_PAN[0] * settle - mobilePan, BRIDGE_PAN[1] * settle],
        drive?.width ?? PLATE_WIDTH,
        drive?.height ?? PLATE_HEIGHT,
        view.width,
        view.height,
        zoom,
      );
      const driveOffset: [number, number] = [
        drivePanOffset[0] + orbitOffset[0],
        drivePanOffset[1] + orbitOffset[1],
      ];
      const driveDim = DRIVE_DIM * settle;
      const dissolve = driving || pick.bDrive ? 0 : DISSOLVE_ZOOM;
      const zoomA =
        zoom * (1 + dissolve * pick.mix) * (pick.aDrive ? driveZoom : 1);
      const zoomB =
        zoom * (1 - dissolve * (1 - pick.mix)) * (pick.bDrive ? driveZoom : 1);
      const offsetA = pick.aDrive ? driveOffset : orbitOffset;
      const offsetB = pick.bDrive ? driveOffset : orbitOffset;
      if (compositor && pick.a) {
        compositor.setImages(pick.a, pick.b);
        compositor.render({
          mix: pick.mix,
          zoomA,
          zoomB,
          offsetA,
          offsetB,
          time: elapsed,
          flicker: still ? 1 : flickerAt(elapsed),
          grain,
          speed: driving ? speedEase : 0,
          still,
          quadA: slotQuad(pick.keyA),
          quadB: slotQuad(pick.keyB),
          killA: slotKill(pick.keyA),
          killB: slotKill(pick.keyB),
          dimA: pick.aDrive ? driveDim : 0,
          dimB: pick.bDrive ? driveDim : 0,
        });
        if (!composited) {
          composited = true;
          shell.dataset.composited = '1';
        }
        if (!readyFlagged && pick.complete) {
          readyFlagged = true;
          document.documentElement.dataset.ready = '1';
        }
      }
      if (driving && pick.driveIndex >= 0)
        warmDriveFrames(pick.driveIndex, scrubDirection);
      rain.setSpeed(driving ? speedEase : 0);
      rain.step(dt);

      // Neon overlay on the lerped quad, with the orbit slots' zoom and pan.
      const neonOpacity =
        driving || !readyFlagged
          ? 0
          : keyOpacity * (still ? 1 : neonBuzz(elapsed));
      neon.style.transform = quadToMatrix3d(
        quad,
        plateWidth,
        plateHeight,
        view.width,
        view.height,
        // Through a zoom-dissolve the two orbit plates differ by DISSOLVE_ZOOM; follow the
        // lerp. The bridge's slot B is a drive frame with its own geometry: stay on plate 10.
        pick.bDrive ? zoomA : lerp(zoomA, zoomB, kt),
        orbitOffset,
        NEON_BOX_WIDTH,
        NEON_BOX_HEIGHT,
      );
      neon.style.opacity = neonOpacity.toFixed(3);
      if (!neonFilterMoved) moveNeonFilter();

      // Window-cards: the track slides in at the start of the drive; cards move in sync with g
      // but dwell on each project (staircase) instead of sitting mid-transit.
      track.style.transform = `translate3d(${((1 - trackIn) * 110).toFixed(3)}vw, 0, 0)`;
      const raw = driveEase * (PROJECTS.length - 1);
      const rawFloor = Math.floor(raw);
      const cardPosition = Math.min(
        rawFloor + smoothstep(0.35, 0.65, raw - rawFloor),
        PROJECTS.length - 1,
      );
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const distance = index - cardPosition;
        card.style.setProperty('--shift', distance.toFixed(4));
        card.style.setProperty(
          '--near',
          clamp(1 - Math.abs(distance)).toFixed(4),
        );
        const hide = Math.abs(distance) > 1.6;
        if (hide !== cardHidden[index]) {
          cardHidden[index] = hide;
          card.style.visibility = hide ? 'hidden' : '';
        }
      });

      // HUD text: change-guarded React state for anything that alters markup; the velocity
      // readout and the sequence variable are written straight to the DOM.
      const nextPhase: Phase = pick.buffering
        ? 'BUFFERING'
        : p < ORBIT_START
          ? 'READY'
          : driving
            ? 'DRIVING'
            : 'CAMERA ORBIT';
      if (nextPhase !== previousPhase) {
        previousPhase = nextPhase;
        setPhase(nextPhase);
      }
      const nextActive = Math.round(cardPosition);
      if (nextActive !== previousActive) {
        previousActive = nextActive;
        setActiveProject(nextActive);
      }
      const nextSpeed = Math.round(TOP_SPEED * speedEase);
      if (nextSpeed !== previousSpeed) {
        previousSpeed = nextSpeed;
        const readout = speedRef.current;
        if (readout) readout.textContent = String(nextSpeed);
      }
      const sequence = p.toFixed(5);
      if (sequence !== previousSequence) {
        previousSequence = sequence;
        shell.style.setProperty('--sequence', sequence);
      }

      if (!doneFlagged && drive && driveReady() >= drive.count) flagDone();
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      abort.abort();
      rain.dispose();
      compositor?.dispose();
      neon.style.filter = '';
      if (neonSvg) neonSvg.style.filter = '';
      delete document.documentElement.dataset.ready;
      delete document.documentElement.dataset.loaded;
      delete shell.dataset.composited;
      delete shell.dataset.still;
    };
  }, []);

  const driving = phase === 'DRIVING' || phase === 'BUFFERING';
  const activeName = PROJECTS[activeProject]?.name ?? '';

  return (
    <main
      className="cinematic-shell"
      ref={shellRef}
      style={{ '--sequence': 0 } as React.CSSProperties}
    >
      <h1 className="visually-hidden">
        Nathan W. — Software developer, builder
      </h1>

      <canvas
        className="plate-canvas"
        ref={plateCanvasRef}
        aria-hidden="true"
      />
      <canvas className="rain-canvas" ref={rainCanvasRef} aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />

      <div className="neon-sign" ref={neonRef} aria-hidden="true">
        {/*
          The baked text arches with the curved glass, so every glyph sits on its own measured
          baseline and advance (NEON_GLYPHS, in the frame of the plate-0 keyframe quad); the
          quad's matrix3d then carries the whole box onto the plate.
        */}
        <svg
          viewBox={`0 0 ${String(NEON_BOX_UNITS[0])} ${String(NEON_BOX_UNITS[1])}`}
          width={NEON_BOX_WIDTH}
          height={NEON_BOX_HEIGHT}
          focusable="false"
        >
          {NEON_GLYPHS.map((glyph, index) =>
            glyph.text === '•' ? (
              <circle
                key={`${glyph.line}${String(index)}`}
                className="neon-dot"
                cx={glyph.x + glyph.width / 2}
                cy={glyph.y}
                r={glyph.width / 2}
              />
            ) : (
              <text
                key={`${glyph.line}${String(index)}`}
                className={glyph.line === 'name' ? 'neon-name' : 'neon-role'}
                x={glyph.x}
                y={glyph.y}
                textLength={glyph.width}
                lengthAdjust="spacingAndGlyphs"
              >
                {glyph.text}
              </text>
            ),
          )}
        </svg>
      </div>

      <nav className="cinematic-nav" aria-label="Portfolio navigation">
        <a
          className="cinematic-brand"
          href="https://nathanw.me"
          aria-label="Nathan W. home"
        >
          NW<span>.</span>
        </a>
        <p>
          <i /> NathanW.me / 2026
        </p>
        <a href="mailto:hello@nathanw.me">Contact ↗</a>
      </nav>

      <div className="window-track" ref={trackRef}>
        {PROJECTS.map((project, index) => {
          const active = activeProject === index;
          return (
            <article
              className={active ? 'window-card is-active' : 'window-card'}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              key={project.code}
              aria-hidden={!(driving && active)}
            >
              <span className="window-ghost" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="window-topline">
                <span>{project.code}</span>
                <span>{project.category}</span>
              </div>
              <div className="window-copy">
                <h2>{project.name}</h2>
                <p>{project.description}</p>
                <span>{project.stack}</span>
              </div>
              <a
                href={project.href}
                target="_blank"
                rel="noreferrer"
                tabIndex={driving && active ? 0 : -1}
              >
                View repository <b>↗</b>
              </a>
            </article>
          );
        })}
      </div>

      <aside className="sequence-hud" aria-label="Sequence progress">
        <div className="hud-phase">
          <span>Sequence</span>
          <strong>{phase}</strong>
        </div>
        <div className="hud-meter">
          <i>
            <b />
          </i>
          <span>
            {String(activeProject + 1).padStart(2, '0')} /{' '}
            {String(PROJECTS.length).padStart(2, '0')}
          </span>
        </div>
        <div className="hud-speed">
          <span>Velocity</span>
          <strong>
            <span ref={speedRef}>0</span> KM/H
          </strong>
        </div>
      </aside>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {driving
          ? `Project ${String(activeProject + 1)} of ${String(PROJECTS.length)}: ${activeName}`
          : ''}
      </p>

      <div className="scroll-instruction" aria-hidden="true">
        <span>Scroll to control the shot</span>
        <i>
          <b />
        </i>
        <span>Front / Side / Drive</span>
      </div>

      {!failed && !loadDone && (
        <output
          className={orbitReady ? 'scene-loader is-ambient' : 'scene-loader'}
        >
          <span className="loader-label">
            {orbitReady ? 'Loading the drive' : 'Preparing the shot'}
          </span>
          <i aria-hidden="true">
            <b
              ref={loaderBarRef}
              style={{
                width: '100%',
                transformOrigin: 'left',
                transform: 'scaleX(0)',
              }}
            />
          </i>
          <span className="loader-value" ref={loaderValueRef} aria-hidden="true">
            0%
          </span>
        </output>
      )}
    </main>
  );
}
