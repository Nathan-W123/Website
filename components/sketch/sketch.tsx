'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useMotionValueEvent, useSpring, useTransform, type MotionValue } from 'motion/react';
import { GALLERY, OWNER, type GalleryProject } from './data';
import { HATCH, PENCIL_SOFT, PencilDefs, Rough } from './rough';
import './sketch.css';

declare global {
  interface Window {
    /** Set by the standalone artifact bundle so images resolve relatively. */
    __SKETCH_BASE?: string;
  }
}

const assetBase = () => (typeof window !== 'undefined' && window.__SKETCH_BASE) || '';

/* Progress p walks through three scenes. */
const SEG = { house: [0, 1], hall: [1, 2.2], gallery: [2.2, 4.4] } as const;
const P_MAX = SEG.gallery[1];
const HALL_LENGTH = 3600;
const HALL_STOP = 340; // distance from the end wall where the walk ends
const WALL_DIST = 380;
const perspectiveFor = (W: number, H: number) => Math.max(640, Math.min(W, H) * 0.95);

type Stage = 'house' | 'hall' | 'gallery';
const stageOf = (p: number): Stage => (p < SEG.hall[0] ? 'house' : p < SEG.gallery[0] ? 'hall' : 'gallery');

function useViewport() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return size;
}

export default function SketchPortfolio() {
  const vp = useViewport();
  const p = useMotionValue(0);
  const sp = useSpring(p, { stiffness: 70, damping: 22, mass: 0.7 });
  const [stage, setStage] = useState<Stage>('house');
  const [active, setActive] = useState<GalleryProject | null>(null);
  const [about, setAbout] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(sp, 'change', (v) => {
    const s = stageOf(v);
    setStage((prev) => (prev === s ? prev : s));
  });

  const nudge = (dp: number) => p.set(Math.min(P_MAX, Math.max(0, p.get() + dp)));
  const jump = (to: number) => p.set(Math.min(P_MAX, Math.max(0, to)));

  // Wheel, drag and keys all move the same progress value.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (active || about) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      nudge(d * 0.0011);
    };
    let last: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      last = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!last || active || about) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      const s = stageOf(p.get());
      const d = s === 'gallery' ? (Math.abs(dx) > Math.abs(dy) ? dx : dy) : dy;
      nudge(-d * 0.0018);
    };
    const onUp = () => (last = null);
    const onKey = (e: KeyboardEvent) => {
      if (active || about) return;
      const fwd = ['ArrowUp', 'ArrowRight', 'w', 'd', 'W', 'D', ' '].includes(e.key);
      const back = ['ArrowDown', 'ArrowLeft', 's', 'a', 'S', 'A'].includes(e.key);
      if (!fwd && !back) return;
      e.preventDefault();
      nudge(fwd ? 0.06 : -0.06);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [active, about]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep links: #hall, #gallery, #about, or #p=1.5 for QC.
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace('#', '');
      if (h === 'hall') p.set(SEG.hall[0] + 0.02);
      else if (h === 'gallery') p.set(SEG.gallery[0] + 0.02);
      else if (h === 'about') setAbout(true);
      else if (h.startsWith('p=')) p.set(Math.min(P_MAX, Math.max(0, Number(h.slice(2)) || 0)));
    };
    window.addEventListener('hashchange', apply);
    const id = window.setTimeout(apply, 0);
    return () => {
      window.removeEventListener('hashchange', apply);
      window.clearTimeout(id);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hold-to-walk buttons for phones.
  const holdRef = useRef<number | null>(null);
  const hold = (dir: 1 | -1) => {
    const tick = () => {
      nudge(dir * 0.008);
      holdRef.current = requestAnimationFrame(tick);
    };
    holdRef.current = requestAnimationFrame(tick);
  };
  const release = () => {
    if (holdRef.current) cancelAnimationFrame(holdRef.current);
    holdRef.current = null;
  };

  const W = vp?.w ?? 1280;
  const H = vp?.h ?? 720;

  const hint = stage === 'house' ? 'Scroll, drag or hold Walk to go inside' : stage === 'hall' ? 'Walk down the hall · doors open on click' : 'Stroll along the wall · tap a poster';

  return (
    <div ref={rootRef} className="sk-root" style={{ ['--persp' as string]: `${perspectiveFor(W, H)}px` }}>
      <PencilDefs />
      <div className="sk-paper" aria-hidden="true" />

      <HouseScene sp={sp} onEnter={() => jump(SEG.hall[0] + 0.02)} />
      {vp && <HallScene sp={sp} W={W} H={H} onAbout={() => setAbout(true)} onGallery={() => jump(SEG.gallery[0] + 0.02)} />}
      {vp && <GalleryScene sp={sp} W={W} H={H} onOpen={setActive} onBack={() => jump(SEG.hall[0] + 0.5)} />}

      <header className="sk-hud sk-hud-top">
        <button type="button" className="sk-brand" onClick={() => jump(0)}>
          {OWNER.name}
        </button>
        <nav className="sk-nav">
          <button type="button" onClick={() => setAbout(true)}>About</button>
          <button type="button" onClick={() => jump(SEG.gallery[0] + 0.02)}>Gallery</button>
          <a href={OWNER.github} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>

      <footer className="sk-hud sk-hud-bottom">
        <p className="sk-hint" key={stage}>{hint}</p>
        <div className="sk-walk">
          <button type="button" aria-label="Walk back" onPointerDown={() => hold(-1)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
            ◀ back
          </button>
          <button type="button" aria-label="Walk forward" onPointerDown={() => hold(1)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
            walk ▶
          </button>
        </div>
      </footer>

      {active && <ProjectCard project={active} onClose={() => setActive(null)} />}
      {about && <AboutCard onClose={() => setAbout(false)} />}
    </div>
  );
}

/* ---------- Scene 1: outside the house ---------- */

function HouseScene({ sp, onEnter }: { sp: MotionValue<number>; onEnter: () => void }) {
  const [a, b] = SEG.house;
  const scale = useTransform(sp, [a, b], [1, 9], { ease: (t) => t * t * t });
  const opacity = useTransform(sp, [a + 0.78, b], [1, 0]);
  const visibility = useTransform(sp, (v) => (v < b + 0.02 ? 'visible' : 'hidden'));
  return (
    <motion.div className="sk-scene sk-house" style={{ opacity, visibility }}>
      <motion.div className="sk-house-zoom" style={{ scale, transformOrigin: '50% 68%' }}>
      <svg viewBox="0 0 1000 620" className="sk-house-svg">
        {/* ground and path */}
        <Rough kind="line" x1={40} y1={470} x2={960} y2={470} seed={1} opts={{ strokeWidth: 1.8 }} />
        <Rough kind="line" x1={478} y1={472} x2={400} y2={612} seed={2} />
        <Rough kind="line" x1={522} y1={472} x2={600} y2={612} seed={3} />
        <Rough kind="line" x1={455} y1={512} x2={545} y2={512} seed={4} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="line" x1={432} y1={556} x2={568} y2={556} seed={5} opts={{ stroke: PENCIL_SOFT }} />
        {/* cottage */}
        <Rough kind="rect" x={330} y={252} w={340} h={218} seed={6} opts={{ strokeWidth: 1.8 }} />
        <Rough kind="poly" points={[[300, 262], [500, 118], [700, 262]]} seed={7} opts={HATCH} />
        <Rough kind="poly" points={[[300, 262], [500, 118], [700, 262]]} seed={8} opts={{ strokeWidth: 2 }} />
        <Rough kind="rect" x={596} y={150} w={40} h={62} seed={9} />
        <Rough kind="line" x1={592} y1={148} x2={640} y2={148} seed={10} />
        {/* windows */}
        <Rough kind="rect" x={372} y={300} w={64} h={54} seed={11} />
        <Rough kind="line" x1={404} y1={300} x2={404} y2={354} seed={12} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="line" x1={372} y1={327} x2={436} y2={327} seed={13} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="rect" x={564} y={300} w={64} h={54} seed={14} />
        <Rough kind="line" x1={596} y1={300} x2={596} y2={354} seed={15} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="line" x1={564} y1={327} x2={628} y2={327} seed={16} opts={{ stroke: PENCIL_SOFT }} />
        {/* door */}
        <Rough kind="rect" x={468} y={346} w={64} h={124} seed={17} opts={{ strokeWidth: 1.8 }} />
        <Rough kind="rect" x={478} y={358} w={44} h={46} seed={18} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="rect" x={478} y={412} w={44} h={46} seed={19} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="circle" cx={522} cy={412} d={7} seed={20} opts={{ fill: '#5c5f65', fillStyle: 'solid' }} />
        {/* sign post */}
        <Rough kind="line" x1={228} y1={470} x2={228} y2={296} seed={21} opts={{ strokeWidth: 2.2 }} />
        <Rough kind="line" x1={228} y1={296} x2={318} y2={296} seed={22} opts={{ strokeWidth: 2.2 }} />
        <Rough kind="line" x1={228} y1={318} x2={252} y2={296} seed={23} />
        <Rough kind="line" x1={250} y1={296} x2={250} y2={312} seed={24} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="line" x1={300} y1={296} x2={300} y2={312} seed={25} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="rect" x={196} y={312} w={160} h={54} seed={26} opts={{ strokeWidth: 2 }} />
        <text x={276} y={350} textAnchor="middle" className="sk-sign-text">PORTFOLIO</text>
        {/* bushes and a tree */}
        <Rough kind="ellipse" cx={700} cy={462} w={70} h={34} seed={27} />
        <Rough kind="ellipse" cx={758} cy={464} w={54} h={28} seed={28} />
        <Rough kind="line" x1={860} y1={470} x2={860} y2={330} seed={29} opts={{ strokeWidth: 2.2 }} />
        <Rough kind="ellipse" cx={860} cy={290} w={150} h={120} seed={30} opts={{ strokeWidth: 1.6 }} />
        <Rough kind="ellipse" cx={860} cy={290} w={150} h={120} seed={31} opts={{ ...HATCH, hachureGap: 11, hachureAngle: 30 }} />
        <Rough kind="line" x1={860} y1={400} x2={892} y2={370} seed={32} />
        <Rough kind="line" x1={860} y1={378} x2={834} y2={352} seed={33} />
        {/* invisible hit area on the door */}
        <rect x={462} y={340} width={76} height={134} fill="transparent" style={{ cursor: 'pointer' }} onClick={onEnter}>
          <title>Enter</title>
        </rect>
      </svg>
      </motion.div>
      <div className="sk-house-caption">
        <span className="sk-h1">{OWNER.name}</span>
        <span className="sk-sub">{OWNER.role}</span>
      </div>
    </motion.div>
  );
}

/* ---------- Scene 2: the hallway ---------- */

function HallScene({ sp, W, H, onAbout, onGallery }: { sp: MotionValue<number>; W: number; H: number; onAbout: () => void; onGallery: () => void }) {
  const [a, b] = SEG.hall;
  const L = HALL_LENGTH;
  const camZ = useTransform(sp, [a, b], [0, L - HALL_STOP]);
  const bob = useTransform(camZ, (z) => Math.sin(z / 62) * 4);
  const transform = useTransform(() => `translate3d(0px, ${bob.get()}px, ${camZ.get()}px)`);
  const opacity = useTransform(sp, [a - 0.2, a, b - 0.06, b], [0, 1, 1, 0]);
  const visibility = useTransform(sp, (v) => (v > a - 0.24 && v < b + 0.02 ? 'visible' : 'hidden'));

  const doorH = Math.round(H * 0.56);
  const doorW = Math.round(doorH * 0.5);
  const endDoorH = Math.round(H * 0.62);
  const endDoorW = Math.round(endDoorH * 0.52);

  return (
    <motion.div className="sk-scene sk-3d" style={{ opacity, visibility }}>
      <motion.div className="sk-world" style={{ transform }}>
        {/* floor */}
        <div className="sk-plane sk-floor" style={{ width: W, height: L, transform: `translate(-50%, -50%) translateY(${H / 2}px) translateZ(${-L / 2}px) rotateX(90deg)` }}>
          <Planks w={W} l={L} along="y" seed={100} />
        </div>
        {/* ceiling */}
        <div className="sk-plane sk-ceiling" style={{ width: W, height: L, transform: `translate(-50%, -50%) translateY(${-H / 2}px) translateZ(${-L / 2}px) rotateX(90deg)` }}>
          <svg viewBox={`0 0 ${W} ${L}`} width={W} height={L} className="sk-svg">
            {Array.from({ length: Math.floor(L / 420) }, (_, i) => (
              <Rough key={i} kind="line" x1={0} y1={210 + i * 420} x2={W} y2={210 + i * 420} seed={200 + i} opts={{ stroke: PENCIL_SOFT, strokeWidth: 2 }} />
            ))}
          </svg>
        </div>
        {/* left wall */}
        <div className="sk-plane sk-wall" style={{ width: L, height: H, transform: `translate(-50%, -50%) translateX(${-W / 2}px) translateZ(${-L / 2}px) rotateY(90deg)` }}>
          <WallLines l={L} h={H} seed={300} />
          <Door x={780} w={doorW} h={doorH} H={H} label="ABOUT" seed={310} onClick={onAbout} />
          <div className="sk-splash" style={{ left: 1560, top: H * 0.2 }}>
            <span className="sk-splash-name">{OWNER.name}</span>
            <span className="sk-splash-role">{OWNER.role}</span>
            <span className="sk-splash-line">{OWNER.line}</span>
          </div>
          <Door x={2740} w={doorW} h={doorH} H={H} label="GITHUB" seed={320} href={OWNER.github} />
        </div>
        {/* right wall */}
        <div className="sk-plane sk-wall" style={{ width: L, height: H, transform: `translate(-50%, -50%) translateX(${W / 2}px) translateZ(${-L / 2}px) rotateY(-90deg)` }}>
          <WallLines l={L} h={H} seed={400} />
          <Window x={L - 520 - 260} y={H * 0.22} w={260} h={H * 0.34} seed={410} />
          <div className="sk-wall-note" style={{ left: L - 1500, top: H * 0.3 }}>
            <span>twelve projects hang in the gallery at the end of the hall</span>
            <span className="sk-arrow">⟶</span>
          </div>
          <Window x={L - 2400 - 260} y={H * 0.22} w={260} h={H * 0.34} seed={420} />
        </div>
        {/* end wall */}
        <div className="sk-plane sk-endwall" style={{ width: W, height: H, transform: `translate(-50%, -50%) translateZ(${-L}px)` }}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="sk-svg">
            <Rough kind="line" x1={0} y1={H - 16} x2={W} y2={H - 16} seed={501} opts={{ strokeWidth: 2 }} />
          </svg>
          <Door x={W / 2 - endDoorW / 2} w={endDoorW} h={endDoorH} H={H} label="THE GALLERY" seed={510} onClick={onGallery} big />
        </div>
      </motion.div>
    </motion.div>
  );
}

function WallLines({ l, h, seed }: { l: number; h: number; seed: number }) {
  return (
    <svg viewBox={`0 0 ${l} ${h}`} width={l} height={h} className="sk-svg">
      <Rough kind="line" x1={0} y1={h - 16} x2={l} y2={h - 16} seed={seed} opts={{ strokeWidth: 2.2 }} />
      <Rough kind="line" x1={0} y1={h - 34} x2={l} y2={h - 34} seed={seed + 1} opts={{ stroke: PENCIL_SOFT }} />
      <Rough kind="line" x1={0} y1={14} x2={l} y2={14} seed={seed + 2} opts={{ strokeWidth: 1.8 }} />
      <Rough kind="rect" x={0} y={h - 34} w={l} h={18} seed={seed + 3} opts={{ ...HATCH, hachureGap: 9 }} />
    </svg>
  );
}

function Planks({ w, l, along, seed }: { w: number; l: number; along: 'x' | 'y'; seed: number }) {
  // Boards run along the walking direction; joints stagger from board to board.
  const boards = 6;
  const long = along === 'y' ? l : w;
  const across = along === 'y' ? w : l;
  const bw = across / boards;
  const lines: ReactNode[] = [];
  let s = seed;
  for (let i = 1; i < boards; i++) {
    const c = i * bw;
    lines.push(along === 'y' ? <Rough key={`s${i}`} kind="line" x1={c} y1={0} x2={c} y2={long} seed={s++} opts={{ strokeWidth: 1.6 }} /> : <Rough key={`s${i}`} kind="line" x1={0} y1={c} x2={long} y2={c} seed={s++} opts={{ strokeWidth: 1.6 }} />);
  }
  for (let i = 0; i < boards; i++) {
    const c0 = i * bw;
    const step = 520;
    for (let k = ((i * 173) % step) + 60; k < long; k += step) {
      lines.push(along === 'y' ? <Rough key={`j${i}-${k}`} kind="line" x1={c0 + 6} y1={k} x2={c0 + bw - 6} y2={k} seed={s++} opts={{ stroke: PENCIL_SOFT, strokeWidth: 1.4 }} /> : <Rough key={`j${i}-${k}`} kind="line" x1={k} y1={c0 + 6} x2={k} y2={c0 + bw - 6} seed={s++} opts={{ stroke: PENCIL_SOFT, strokeWidth: 1.4 }} />);
      if ((k / step) % 3 < 1) {
        const kx = k + 200;
        lines.push(along === 'y' ? <Rough key={`k${i}-${k}`} kind="ellipse" cx={c0 + bw * 0.5} cy={kx} w={18} h={9} seed={s++} opts={{ stroke: PENCIL_SOFT }} /> : <Rough key={`k${i}-${k}`} kind="ellipse" cx={kx} cy={c0 + bw * 0.5} w={9} h={18} seed={s++} opts={{ stroke: PENCIL_SOFT }} />);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${w} ${l}`} width={w} height={l} className="sk-svg">
      {lines}
    </svg>
  );
}

function Door({ x, w, h, H, label, seed, onClick, href, big }: { x: number; w: number; h: number; H: number; label: string; seed: number; onClick?: () => void; href?: string; big?: boolean }) {
  const top = H - 16 - h;
  const inner = (
    <>
      <svg viewBox={`0 0 ${w + 40} ${h + 60}`} width={w + 40} height={h + 60} className="sk-door-svg">
        <Rough kind="rect" x={20} y={40} w={w} h={h + 4} seed={seed} opts={{ strokeWidth: 2.2 }} />
        <Rough kind="rect" x={12} y={32} w={w + 16} h={h + 12} seed={seed + 1} opts={{ strokeWidth: 1.4, stroke: PENCIL_SOFT }} />
        <Rough kind="rect" x={20 + w * 0.16} y={40 + h * 0.08} w={w * 0.68} h={h * 0.34} seed={seed + 2} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="rect" x={20 + w * 0.16} y={40 + h * 0.5} w={w * 0.68} h={h * 0.4} seed={seed + 3} opts={{ stroke: PENCIL_SOFT }} />
        <Rough kind="circle" cx={20 + w * 0.84} cy={40 + h * 0.5} d={Math.max(7, w * 0.06)} seed={seed + 4} opts={{ fill: '#5c5f65', fillStyle: 'solid' }} />
        <Rough kind="rect" x={20 + w} y={44} w={10} h={h} seed={seed + 5} opts={{ ...HATCH, hachureGap: 5 }} />
      </svg>
      <span className={`sk-door-label${big ? ' sk-door-label-big' : ''}`}>{label}</span>
    </>
  );
  const style = { left: x - 20, top: top - 40, width: w + 40, height: h + 60 };
  return href ? (
    <a className="sk-door" style={style} href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <button type="button" className="sk-door" style={style} onClick={onClick}>
      {inner}
    </button>
  );
}

function Window({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) {
  return (
    <svg viewBox={`0 0 ${w + 20} ${h + 20}`} width={w + 20} height={h + 20} className="sk-svg" style={{ left: x, top: y, width: w + 20, height: h + 20 }}>
      <Rough kind="rect" x={10} y={10} w={w} h={h} seed={seed} opts={{ strokeWidth: 2 }} />
      <Rough kind="rect" x={18} y={18} w={w - 16} h={h - 16} seed={seed + 1} opts={{ stroke: PENCIL_SOFT }} />
      <Rough kind="line" x1={10 + w / 2} y1={18} x2={10 + w / 2} y2={h + 2} seed={seed + 2} opts={{ stroke: PENCIL_SOFT }} />
      <Rough kind="line" x1={18} y1={10 + h / 2} x2={w + 2} y2={10 + h / 2} seed={seed + 3} opts={{ stroke: PENCIL_SOFT }} />
      <Rough kind="path" d={`M ${28} ${h - 30} q ${w * 0.16} -${h * 0.22} ${w * 0.38} -${h * 0.1} t ${w * 0.4} -${h * 0.18}`} seed={seed + 4} opts={{ stroke: PENCIL_SOFT, roughness: 2 }} />
      <Rough kind="line" x1={4} y1={h + 12} x2={w + 16} y2={h + 12} seed={seed + 5} opts={{ strokeWidth: 2 }} />
    </svg>
  );
}

/* ---------- Scene 3: the gallery ---------- */

function GalleryScene({ sp, W, H, onOpen, onBack }: { sp: MotionValue<number>; W: number; H: number; onOpen: (p: GalleryProject) => void; onBack: () => void }) {
  const [a, b] = SEG.gallery;
  // Apparent scale of the wall plane, so poster size can be chosen in screen terms.
  const persp = perspectiveFor(W, H);
  const s = persp / (persp + WALL_DIST);
  const view = W / s; // wall-local width visible at once
  const FRAME_W = Math.round((W < 720 ? 0.8 * W : Math.min(0.34 * W, 0.62 * H)) / s);
  const FRAME_H = Math.round(FRAME_W * 0.625);
  const GAP = Math.round(FRAME_W * 1.32);
  const x0 = Math.round(view / 2 - FRAME_W / 2); // first poster centred in the opening view
  const xOf = (index: number) => x0 + (index - 1) * GAP;
  const endX = xOf(GALLERY.length) + GAP; // the sign-off note takes the slot after the last poster
  const GW = Math.round(endX + view / 2);
  const travel = GW - view;
  const camX = useTransform(sp, [a, b], [0, travel]);
  const bob = useTransform(camX, (x) => Math.sin(x / 58) * 3);
  const transform = useTransform(() => `translate3d(${-camX.get()}px, ${bob.get()}px, 0px)`);
  const opacity = useTransform(sp, [a - 0.06, a], [0, 1]);
  const visibility = useTransform(sp, (v) => (v > a - 0.08 ? 'visible' : 'hidden'));
  const floorDepth = WALL_DIST + 260;
  const WH = Math.round(H * 1.8); // wall taller than the viewport so its top edge stays out of view
  const eyeY = WH - H / 2; // wall-local y of the eye line
  const frameTop = Math.round(eyeY - FRAME_H / 2 - 10);
  const leftEdge = -view / 2; // world x of the wall's left end (aligned with the opening view)
  const chapters = useMemo(() => {
    const out: { title: string; from: number; to: number }[] = [];
    for (const g of GALLERY) {
      const last = out[out.length - 1];
      if (last && last.title === g.chapterTitle) last.to = g.index;
      else out.push({ title: g.chapterTitle, from: g.index, to: g.index });
    }
    return out;
  }, []);
  const labelW = Math.min(260, FRAME_W - 20);

  return (
    <motion.div className="sk-scene sk-3d" style={{ opacity, visibility }}>
      <motion.div className="sk-world" style={{ transform }}>
        {/* floor */}
        <div className="sk-plane sk-floor" style={{ width: GW, height: floorDepth, transform: `translate(${leftEdge}px, ${H / 2 - floorDepth / 2}px) translateZ(${-WALL_DIST + floorDepth / 2}px) rotateX(90deg)` }}>
          <Planks w={GW} l={floorDepth} along="x" seed={600} />
        </div>
        {/* wall */}
        <div className="sk-plane sk-gwall" style={{ width: GW, height: WH, transform: `translate(${leftEdge}px, ${H / 2 - WH}px) translateZ(${-WALL_DIST}px)` }}>
          <svg viewBox={`0 0 ${GW} ${WH}`} width={GW} height={WH} className="sk-svg">
            <Rough kind="line" x1={0} y1={WH - 16} x2={GW} y2={WH - 16} seed={700} opts={{ strokeWidth: 2.2 }} />
            <Rough kind="line" x1={0} y1={WH - 34} x2={GW} y2={WH - 34} seed={701} opts={{ stroke: PENCIL_SOFT }} />
            <Rough kind="rect" x={0} y={WH - 34} w={GW} h={18} seed={702} opts={{ ...HATCH, hachureGap: 9 }} />
            {chapters.map((c, i) => (
              <Rough key={c.title} kind="line" x1={xOf(c.from)} y1={frameTop - 74} x2={xOf(c.to) + FRAME_W} y2={frameTop - 74} seed={710 + i} opts={{ strokeWidth: 1.6 }} />
            ))}
            {GALLERY.map((g) => (
              <g key={g.id}>
                {/* nail and wire */}
                <Rough kind="line" x1={xOf(g.index) + 24} y1={frameTop - 4} x2={xOf(g.index) + FRAME_W / 2} y2={frameTop - 46} seed={800 + g.index} opts={{ stroke: PENCIL_SOFT }} />
                <Rough kind="line" x1={xOf(g.index) + FRAME_W - 24} y1={frameTop - 4} x2={xOf(g.index) + FRAME_W / 2} y2={frameTop - 46} seed={830 + g.index} opts={{ stroke: PENCIL_SOFT }} />
                <Rough kind="circle" cx={xOf(g.index) + FRAME_W / 2} cy={frameTop - 48} d={6} seed={860 + g.index} opts={{ fill: '#5c5f65', fillStyle: 'solid' }} />
                {/* frame with a hatched shadow */}
                <Rough kind="rect" x={xOf(g.index) + 6} y={frameTop + 8} w={FRAME_W + 24} h={FRAME_H + 24} seed={890 + g.index} opts={{ ...HATCH, hachureGap: 6 }} />
                <Rough kind="rect" x={xOf(g.index) - 14} y={frameTop - 14} w={FRAME_W + 28} h={FRAME_H + 28} seed={920 + g.index} opts={{ strokeWidth: 2.4, fill: '#fbfbf8', fillStyle: 'solid' }} />
                <Rough kind="rect" x={xOf(g.index) - 4} y={frameTop - 4} w={FRAME_W + 8} h={FRAME_H + 8} seed={950 + g.index} opts={{ strokeWidth: 1.2, stroke: PENCIL_SOFT }} />
                {/* label plate */}
                <Rough kind="rect" x={xOf(g.index) + FRAME_W / 2 - labelW / 2} y={frameTop + FRAME_H + 34} w={labelW} h={40} seed={980 + g.index} opts={{ strokeWidth: 1.4 }} />
              </g>
            ))}
          </svg>
          {chapters.map((c) => (
            <span key={c.title} className="sk-chapter" style={{ left: xOf(c.from), top: frameTop - 118 }}>
              {c.title}
            </span>
          ))}
          {GALLERY.map((g) => (
            <button key={g.id} type="button" className="sk-poster" style={{ left: xOf(g.index), top: frameTop, width: FRAME_W, height: FRAME_H }} onClick={() => onOpen(g)}>
              <Image src={assetBase() + g.image} alt={`${g.name} interface`} fill sizes="600px" unoptimized draggable={false} />
              <span className="sk-poster-label" style={{ top: FRAME_H + 34, width: labelW }}>
                <b>{g.index.toString().padStart(2, '0')}</b> {g.name}
              </span>
            </button>
          ))}
          <button type="button" className="sk-gallery-back" style={{ left: 24, top: eyeY - 20 }} onClick={onBack}>
            ⟵ back to the hall
          </button>
          <div className="sk-gallery-end" style={{ left: endX - 150, top: eyeY - 70 }}>
            <span>that&apos;s the whole wall.</span>
            <a href={OWNER.github} target="_blank" rel="noreferrer">more on GitHub ⟶</a>
            <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Cards ---------- */

function ProjectCard({ project, onClose }: { project: GalleryProject; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div className="sk-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.dialog open className="sk-card" aria-modal="true" aria-labelledby="sk-card-title" initial={{ y: 24, rotate: -1.2, opacity: 0 }} animate={{ y: 0, rotate: -0.6, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} onClick={(e) => e.stopPropagation()}>
        <header className="sk-card-head">
          <span className="sk-eyebrow">Project details · {project.index.toString().padStart(2, '0')} / {GALLERY.length}</span>
          <button type="button" className="sk-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <figure className="sk-card-shot">
          <Image src={assetBase() + project.image} alt={`${project.name} interface`} fill sizes="600px" unoptimized />
        </figure>
        <h2 id="sk-card-title" className="sk-card-title">{project.name}</h2>
        <p className="sk-card-tagline">{project.tagline}</p>
        <ul className="sk-card-notes">
          {project.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <h3 className="sk-card-h3">Tech stack</h3>
        <ul className="sk-chips">
          {project.stackTokens.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="sk-card-actions">
          <a className="sk-btn sk-btn-primary" href={project.href} target="_blank" rel="noreferrer">Open project ⟶</a>
          <button type="button" className="sk-btn" onClick={onClose}>Back to the wall</button>
        </div>
      </motion.dialog>
    </motion.div>
  );
}

function AboutCard({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div className="sk-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.dialog open className="sk-card" aria-modal="true" aria-labelledby="sk-about-title" initial={{ y: 24, rotate: 1.2, opacity: 0 }} animate={{ y: 0, rotate: 0.6, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} onClick={(e) => e.stopPropagation()}>
        <header className="sk-card-head">
          <span className="sk-eyebrow">About</span>
          <button type="button" className="sk-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <h2 id="sk-about-title" className="sk-card-title">{OWNER.name}</h2>
        <p className="sk-card-tagline">{OWNER.role}</p>
        <p className="sk-card-body">{OWNER.line}</p>
        <p className="sk-card-body">
          The wall at the end of the hall holds twelve projects: general-relativistic ray tracing, a lattice-Boltzmann wind tunnel, a Hartree–Fock engine, a chess network that plays on Lichess, a reinforcement-learning agent, and the coordination tools built around them.
        </p>
        <div className="sk-card-actions">
          <a className="sk-btn sk-btn-primary" href={OWNER.github} target="_blank" rel="noreferrer">GitHub ⟶</a>
          <a className="sk-btn" href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
        </div>
      </motion.dialog>
    </motion.div>
  );
}
