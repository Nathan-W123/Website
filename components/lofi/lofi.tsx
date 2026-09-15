'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { CHAPTERS } from '@/components/notebook/content';
import { Overlay } from './overlay';
import { ROOM, type Rect, type RoomArt } from './room';
import './lofi.css';

declare global {
  interface Window {
    /** Set by the standalone artifact bundle so the painting resolves relatively. */
    __LOFI_BASE?: string;
  }
}

const PROJECTS = CHAPTERS.flatMap((c) => c.projects);
type HotspotId = keyof RoomArt['hotspots'];

const HOTSPOT_OUTLINES: Record<HotspotId, string> = {
  laptop: 'M 41 5 L 96 14 L 90 65 L 82 80 L 58 96 L 25 88 L 5 76 L 5 66 L 35 55 Z',
  sketchbook: 'M 28 8 L 84 8 L 89 13 L 93 16 L 84 86 L 80 98 L 11 98 L 4 94 L 4 87 L 7 81 L 11 60 L 16 38 L 21 32 L 25 13 Z',
};

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

/** Cover-fit box for the painting: scale k, and where its top-left lands on screen. */
function coverBox(art: RoomArt, W: number, H: number) {
  const landscape = W >= H;
  const cover = Math.max(W / art.width, H / art.height);
  // Wide screens: never crop away more than the painting allows. Portrait: keep the
  // hotspot span in view. Either way a blurred backdrop fills what the painting cannot.
  const cap = landscape ? H / (art.height * art.minVisibleHeight) : W / (art.portraitSpan[1] - art.portraitSpan[0]);
  const k = Math.min(cover, cap);
  const bw = art.width * k;
  const bh = art.height * k;
  const focus = landscape ? art.focus.landscape : art.focus.portrait;
  let ox = bw >= W ? -(bw - W) * focus.x : (W - bw) / 2;
  if (!landscape && bw >= W) ox = W / 2 - ((art.portraitSpan[0] + art.portraitSpan[1]) / 2) * k;
  const oy = bh >= H ? -(bh - H) * focus.y : (H - bh) / 2;
  return { k, bw, bh, ox, oy, portrait: !landscape, letterboxed: bw < W || bh < H, toScreen: (x: number, y: number) => ({ sx: ox + x * k, sy: oy + y * k }) };
}

export default function LofiRoom({ art = ROOM }: { art?: RoomArt }) {
  const vp = useViewport();
  const W = vp?.w ?? 1280;
  const H = vp?.h ?? 720;
  const [zoomed, setZoomed] = useState<HotspotId | null>(null);
  const [hovered, setHovered] = useState<HotspotId | null>(null);
  const [origin, setOrigin] = useState({ sx: 0, sy: 0 });
  // The painting is only rendered after mount (vp is set), so window is safe to read here.
  const base = vp ? (window.__LOFI_BASE ?? '') : '';

  const box = coverBox(art, W, H);

  // Gentle parallax from the pointer, desktop only.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spx = useSpring(px, { stiffness: 30, damping: 20 });
  const spy = useSpring(py, { stiffness: 30, damping: 20 });
  const parallax = useTransform(() => `translate3d(${spx.get()}px, ${spy.get()}px, 0)`);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      px.set(((e.clientX / W) - 0.5) * -14);
      py.set(((e.clientY / H) - 0.5) * -10);
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, [W, H, px, py]);

  const pick = useCallback(
    (id: HotspotId) => {
      const r = art.hotspots[id];
      setOrigin(box.toScreen(r.x + r.w / 2, r.y + r.h / 2));
      setZoomed(id);
      setHovered(null);
    },
    [art, box],
  );
  const close = useCallback(() => setZoomed(null), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  let target = { x: 0, y: 0, scale: 1 };
  if (zoomed) {
    const r = art.hotspots[zoomed];
    const fit = Math.min(W / (r.w * box.k), H / (r.h * box.k)) * 0.9;
    target = { x: W / 2 - origin.sx, y: H / 2 - origin.sy, scale: Math.min(6, Math.max(1.6, fit)) };
  }

  const pct = (r: Rect) => ({ left: `${(r.x / art.width) * 100}%`, top: `${(r.y / art.height) * 100}%`, width: `${(r.w / art.width) * 100}%`, height: `${(r.h / art.height) * 100}%` });

  return (
    <div ref={rootRef} className={`lf-root${zoomed ? ' is-zoomed' : ''}`}>
      <motion.div className="lf-stage" style={{ transformOrigin: `${origin.sx}px ${origin.sy}px` }} animate={target} transition={{ type: 'spring', stiffness: 60, damping: 18, mass: 1 }}>
        <motion.div className="lf-parallax" style={{ transform: parallax }}>
          {vp && box.letterboxed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="lf-backdrop" src={base + art.src} alt="" aria-hidden="true" draggable={false} />
          )}
          {vp && (
            <div className="lf-art lf-breathe" style={{ left: box.ox, top: box.oy, width: box.bw, height: box.bh }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={base + art.src} alt="" width={art.width} height={art.height} draggable={false} />
              <Overlay art={art} />
              {(Object.keys(art.hotspots) as HotspotId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`lf-hot${hovered === id ? ' is-hover' : ''}`}
                  style={pct(art.hotspots[id])}
                  tabIndex={zoomed ? -1 : 0}
                  aria-label={id === 'laptop' ? 'Open the laptop: engineering projects' : 'Open the sketchbook: art projects'}
                  onClick={() => pick(id)}
                  onPointerEnter={() => setHovered(id)}
                  onPointerLeave={() => setHovered(null)}
                >
                  <svg className="lf-hot-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d={HOTSPOT_OUTLINES[id]} />
                  </svg>
                  <span className="lf-tag">{id === 'laptop' ? 'Engineering' : 'Art'}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      <div className="lf-vignette" aria-hidden="true" />
      <div className="lf-grain" aria-hidden="true" />

      <AnimatePresence>
        {zoomed === 'laptop' && (
          <motion.section key="laptop" className="lf-panel lf-panel-screen" initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.98, x: '-50%', y: '-50%' }} transition={{ delay: 0.45, duration: 0.35 }} aria-label="Engineering projects">
            <div className="lf-screen-bar">
              <span className="lf-dot" /><span className="lf-dot" /><span className="lf-dot" />
              <span className="lf-screen-title">~/engineering</span>
              <button type="button" className="lf-back" onClick={close}>← back to the desk</button>
            </div>
            <div className="lf-screen-body">
              <h2>Engineering</h2>
              <p className="lf-lede">Simulators of spacetime, air and molecules, and the agents and tools that work inside them. Project pages come next; this is the index.</p>
              <ul className="lf-apps">
                {PROJECTS.map((p) => (
                  <li key={p.id}>
                    <a href={p.href} target="_blank" rel="noreferrer">
                      <span className="lf-app-icon" style={{ background: p.accentHex }} />
                      <span className="lf-app-name">{p.name}</span>
                      <span className="lf-app-line">{p.tagline}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}
        {zoomed === 'sketchbook' && (
          <motion.section key="sketchbook" className="lf-panel lf-panel-paper" initial={{ opacity: 0, scale: 0.96, rotate: -1, x: '-50%', y: '-50%' }} animate={{ opacity: 1, scale: 1, rotate: -0.5, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.98, x: '-50%', y: '-50%' }} transition={{ delay: 0.45, duration: 0.35 }} aria-label="Art projects">
            <div className="lf-paper-head">
              <h2>Sketchbook</h2>
              <button type="button" className="lf-back lf-back-paper" onClick={close}>← back to the desk</button>
            </div>
            <p className="lf-lede">Art projects live here. The pages are blank until you send me the pieces; each one gets a spread of its own.</p>
            <ul className="lf-polaroids">
              {['sketch 01', 'sketch 02', 'sketch 03', 'sketch 04', 'sketch 05', 'sketch 06'].map((s, i) => (
                <li key={s} style={{ ['--tilt' as string]: `${(i % 3) - 1}deg` }}>
                  <span className="lf-polaroid-img" />
                  <span className="lf-polaroid-cap">{s}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>

      {zoomed && <button type="button" className="lf-scrim" aria-label="Back to the desk" onClick={close} />}
    </div>
  );
}
