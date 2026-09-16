'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Rough } from '@/components/sketch/rough';
import { ABOUT, ART, CONTACTS, NAME, PROJECT_GROUPS, WORKED_WITH, type Card } from './content';
import type { Study } from './studies';
import { SignChain } from './chain';
import { Doodles } from './doodles';
import { HangingSign } from './hanging';
import { Landing } from './landing';
import { IndexCard, StickyBoard } from './notes';
import { ContactIcon } from './icons';
import { TONE_DARK, outline, shadow, tone } from './ink';
import type { Plank } from './signpost';
import './signs.css';

declare global {
  interface Window {
    __SIGNS_BASE?: string;
  }
}
const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

/**
 * Routes, kept in the hash so the browser's back button works:
 *   #/            home signpost
 *   #/art         art signpost          #/art/<section>       framed pieces
 *   #/projects    projects signpost     #/projects/<group>    project cards
 *   #/contact     contact chain
 */
type Route = { page: 'home' } | { page: 'art'; section?: string } | { page: 'projects'; group?: string } | { page: 'contact' } | { page: 'about' };

const parse = (hash: string): Route => {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'art') return { page: 'art', section: parts[1] };
  if (parts[0] === 'projects') return { page: 'projects', group: parts[1] };
  if (parts[0] === 'contact') return { page: 'contact' };
  if (parts[0] === 'about') return { page: 'about' };
  return { page: 'home' };
};
const routeKey = (r: Route) => (r.page === 'art' ? `art/${r.section ?? ''}` : r.page === 'projects' ? `projects/${r.group ?? ''}` : r.page);
const depth = (r: Route) => (r.page === 'home' ? 0 : (r.page === 'art' && r.section) || (r.page === 'projects' && r.group) ? 2 : 1);

/** Which way the world moves during a swipe. A plank pointing right sends the world left. */
type Dir = 'left' | 'right' | 'up' | 'down';
const reverse = (d: Dir): Dir => (d === 'left' ? 'right' : d === 'right' ? 'left' : d === 'up' ? 'down' : 'up');
const plankDir = (p: Plank): Dir => (p.href === '#/contact' ? 'up' : p.dir === 'right' ? 'left' : 'right');

const FAR = '200';
const SWIPE = 1.05;
const TEAR = 1.0;
const ease = [0.7, 0, 0.3, 1] as const;
type Mode = 'swipe' | 'tear' | 'fade';
type Move = { dir: Dir; mode: Mode; slow?: number };

/** A jagged top edge as an SVG mask (static: applied once when the sheet starts tearing, so no repaints). */
const TORN = [4.2, 1.2, 5.6, 1.8, 4.9, 0.8, 6.3, 2.3, 3.9, 1.3, 5.3, 2.8, 4.6];
const TORN_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><polygon fill='black' points='${TORN.map((y, i) => `${((i / (TORN.length - 1)) * 100).toFixed(2)},${y}`).join(' ')} 100,100 0,100'/></svg>`,
)}")`;
const NO_MASK = 'none';

const variants: Variants = {
  enter: ({ dir: d, mode }: Move) =>
    mode === 'tear'
      ? { x: 0, y: 0, scale: 1, rotate: 0, rotateX: 0, rotateY: 0, opacity: 1, zIndex: 0, maskImage: NO_MASK, WebkitMaskImage: NO_MASK, transition: { duration: 0.01 } }
      : mode === 'fade'
        ? { x: 0, y: 0, scale: 1, rotate: 0, rotateX: 0, rotateY: 0, zIndex: 1, opacity: 0, maskImage: NO_MASK, WebkitMaskImage: NO_MASK }
        : { x: d === 'left' ? `${FAR}vw` : d === 'right' ? `-${FAR}vw` : 0, y: d === 'up' ? `${FAR}vh` : d === 'down' ? `-${FAR}vh` : 0, scale: 0.9, rotate: 0, rotateX: 0, rotateY: 0, opacity: 1, zIndex: 1, maskImage: NO_MASK, WebkitMaskImage: NO_MASK },
  center: ({ mode }: Move) => ({ x: 0, y: 0, scale: 1, rotate: 0, rotateX: 0, rotateY: 0, zIndex: 1, opacity: 1, maskImage: NO_MASK, WebkitMaskImage: NO_MASK, transition: mode === 'fade' ? { duration: 0.5, ease: 'easeOut' } : { duration: SWIPE, ease } }),
  exit: ({ dir: d, mode, slow = 1 }: Move) =>
    mode === 'tear'
      ? {
          // the top-right corner is pinched: the sheet twists and bends over from that corner, swinging
          // about the top-left one, then the whole thing drops. Transforms only, so it stays at 60 fps.
          maskImage: TORN_MASK,
          WebkitMaskImage: TORN_MASK,
          rotate: [0, 2, 5, 9, 14, 20, 26, 62],
          rotateX: [0, -4, -9, -15, -22, -28, -32, -44],
          rotateY: [0, 4, 9, 14, 18, 20, 20, 24],
          x: ['0vw', '0.3vw', '0.8vw', '1.4vw', '2vw', '2.6vw', '3vw', '10vw'],
          y: ['0vh', '0vh', '0.3vh', '0.8vh', '1.5vh', '2.6vh', '4vh', '130vh'],
          scale: [1, 1, 1, 1, 1, 1, 1, 0.9],
          opacity: [1, 1, 1, 1, 1, 1, 1, 0.85],
          zIndex: 5,
          transition: { duration: TEAR * slow, times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.62, 1], ease: 'easeIn' },
        }
      : mode === 'fade'
        ? { opacity: 0, x: 0, y: 0, scale: 1, rotate: 0, rotateX: 0, rotateY: 0, zIndex: 0, maskImage: NO_MASK, WebkitMaskImage: NO_MASK, transition: { duration: 0.35, ease: 'easeIn' } }
        : { x: d === 'left' ? `-${FAR}vw` : d === 'right' ? `${FAR}vw` : 0, y: d === 'up' ? `-${FAR}vh` : d === 'down' ? `${FAR}vh` : 0, scale: 0.9, rotate: 0, rotateX: 0, rotateY: 0, opacity: 1, zIndex: 1, maskImage: NO_MASK, WebkitMaskImage: NO_MASK, transition: { duration: SWIPE, ease } },
};
/** Fold shading on the torn sheet: its own layer, opacity only. */
const foldVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 0 },
  exit: ({ mode }: Move) => (mode === 'tear' ? { opacity: [0, 0.35, 0.6, 0.8, 0.85], transition: { duration: TEAR * 0.7, ease: 'easeOut' } } : { opacity: 0 }),
};

export default function Signs() {
  const [route, setRoute] = useState<Route>({ page: 'home' });
  const [move, setMove] = useState<Move>({ dir: 'left', mode: 'swipe' });
  const [swipe, setSwipe] = useState<{ id: number; dir: Dir } | null>(null);
  const [lightbox, setLightbox] = useState<{ image: string; caption: string; materials?: string[] } | null>(null);
  const [project, setProject] = useState<Card | null>(null);
  // the landing page scrolls to the bench; the name tag steps aside once the hero is scrolled past
  const [scrolled, setScrolled] = useState(false);
  // while a sheet is being torn off, the name waits underneath until the tear is done
  const [nameHold, setNameHold] = useState(false);
  const [tearing, setTearing] = useState(false);
  // the direction a plank was clicked in, consumed by the next hash change
  const pending = useRef<Dir | null>(null);
  // set by any Home control: the next trip home tears the sheet off instead of swiping
  const pendingMode = useRef<Mode>('swipe');
  // how each route was entered, so going back reverses it
  const entered = useRef<Record<string, Dir>>({});
  const swipes = useRef(0);

  const routeRef = useRef<Route>({ page: 'home' });
  const first = useRef(true);

  useEffect(() => {
    const apply = () => {
      const cur = routeRef.current;
      const next = parse(window.location.hash);
      const ck = routeKey(cur), nk = routeKey(next);
      if (ck === nk && !first.current) return;
      let d: Dir;
      if (pending.current) {
        d = pending.current;
        entered.current[nk] = d;
      } else if (entered.current[ck] && depth(next) < depth(cur)) {
        d = reverse(entered.current[ck]);
      } else {
        d = next.page === 'contact' ? 'up' : cur.page === 'contact' ? 'down' : depth(next) >= depth(cur) ? 'left' : 'right';
        if (depth(next) > depth(cur)) entered.current[nk] = d;
      }
      const mode: Mode = (next.page === 'home' || next.page === 'about') && !first.current ? pendingMode.current : 'swipe';
      pending.current = null;
      pendingMode.current = 'swipe';
      routeRef.current = next;
      // debug: window.__SLOW = 6 plays the tear in slow motion
      setMove({ dir: d, mode, slow: (window as unknown as { __SLOW?: number }).__SLOW || 1 });
      setRoute(next);
      if (mode === 'tear') {
        setNameHold(true);
        window.setTimeout(() => setNameHold(false), TEAR * 1000 * ((window as unknown as { __SLOW?: number }).__SLOW || 1) - 150);
        setTearing(true);
        window.setTimeout(() => setTearing(false), TEAR * 1000 * ((window as unknown as { __SLOW?: number }).__SLOW || 1) + 50);
      }
      if (!first.current && mode === 'swipe') setSwipe({ id: ++swipes.current, dir: d });
      first.current = false;
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  useEffect(() => {
    if (!swipe) return;
    const t = window.setTimeout(() => setSwipe(null), SWIPE * 1000 + 100);
    return () => window.clearTimeout(t);
  }, [swipe]);

  const onPlank = useCallback((p: Plank) => {
    pending.current = plankDir(p);
    if (p.href === '#/') pendingMode.current = 'tear';
    if (p.href === '#/about') pendingMode.current = 'fade';
  }, []);
  const go = useCallback((hash: string) => {
    window.location.hash = hash;
  }, []);
  const goHome = useCallback(() => {
    pendingMode.current = 'tear';
    window.location.hash = '#/';
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null);
        else if (project) setProject(null);
        else if (route.page !== 'home') window.history.back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, project, route]);

  return (
    <div className={`sg-root${tearing ? ' sg-tearing' : ''}`}>
      <AnimatePresence mode="sync" custom={move} initial={false}>
        <motion.section
          key={routeKey(route)}
          className="sg-page"
          custom={move}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 120)}
        >
          <motion.div className="sg-fold" variants={foldVariants} aria-hidden="true" />
          {route.page === 'home' && move.mode === 'tear' && <TornRemnant />}
          <Doodles seed={routeKey(route).length * 7 + (route.page === 'home' ? 0 : 1)} />
          {route.page === 'home' && <Landing onGo={onPlank} onOpenProject={setProject} onOpenArt={setLightbox} />}

          {route.page === 'art' && !route.section && (
            <div className="sg-wall">
              <BackSign label="Home" onClick={goHome} />
              <StickyBoard
                title="my art"
                onGo={onPlank}
                notes={ART.map((s) => ({ label: s.label.toLowerCase(), sub: `${s.items.length} pieces`, href: `#/art/${s.id}`, dir: 'right' as const }))}
                footer={
                  <>
                    follow me on{' '}
                    <a href={CONTACTS[0].href} target="_blank" rel="noreferrer">
                      <ContactIcon id="instagram" size={30} /> instagram {CONTACTS[0].handle}
                    </a>
                  </>
                }
                aside={<IndexCard title="worked with" items={WORKED_WITH} />}
              />
            </div>
          )}

          {route.page === 'art' && route.section && (
            <ArtWall section={route.section} onOpen={setLightbox} onBack={() => go('#/art')} />
          )}

          {route.page === 'projects' && !route.group && (
            <div className="sg-wall">
              <BackSign label="Home" onClick={goHome} />
              <StickyBoard
                title="my projects"
                onGo={onPlank}
                notes={PROJECT_GROUPS.map((g) => ({ label: g.label.toLowerCase(), sub: `${g.cards.length} ${g.cards.length === 1 ? 'project' : 'projects'}`, href: `#/projects/${g.id}`, dir: 'right' as const }))}
                footer={
                  <>
                    follow me on{' '}
                    <a href={CONTACTS[1].href} target="_blank" rel="noreferrer">
                      <ContactIcon id="linkedin" size={30} /> linkedin
                    </a>{' '}
                    and{' '}
                    <a href={CONTACTS[2].href} target="_blank" rel="noreferrer">
                      <ContactIcon id="github" size={30} /> github {CONTACTS[2].handle}
                    </a>
                  </>
                }
              />
            </div>
          )}

          {route.page === 'projects' && route.group && <Cards group={route.group} onBack={() => go('#/projects')} onOpen={setProject} />}

          {route.page === 'contact' && <Contact onBack={goHome} />}

          {route.page === 'about' && <About onBack={goHome} />}
        </motion.section>
      </AnimatePresence>

      <NameTag page={(route.page === 'home' && scrolled) || nameHold ? 'art' : route.page} onHome={goHome} />

      {swipe && <Dashes key={swipe.id} dir={swipe.dir} />}

      <AnimatePresence>{project && <ProjectView key={project.id} card={project} onClose={() => setProject(null)} />}</AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div className="sg-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            <motion.figure initial={{ scale: 0.7, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.8 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} onClick={(e) => e.stopPropagation()}>
              <div className="sg-lb-row">
                <div className="sg-lightbox-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={base() + lightbox.image} alt={lightbox.caption} />
                </div>
                {lightbox.materials && lightbox.materials.length > 0 && (
                  <aside className="sg-materials">
                    <span className="note-shadow" aria-hidden="true" />
                    <span className="note-paper" aria-hidden="true" />
                    <span className="note-tape" aria-hidden="true" />
                    <h3>Materials</h3>
                    <ul>
                      {lightbox.materials.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </aside>
                )}
              </div>
              <figcaption>{lightbox.caption}</figcaption>
              <button type="button" className="sg-close" onClick={() => setLightbox(null)} aria-label="Close">×</button>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- swipe dashes: cartoon speed lines streaking past ---------- */

const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function Dashes({ dir }: { dir: Dir }) {
  const horizontal = dir === 'left' || dir === 'right';
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  return (
    <div className="sg-dashes" aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => {
        const pos = 4 + rnd(i, 1) * 92;
        const len = 70 + rnd(i, 2) * 260;
        const thick = 5 + Math.round(rnd(i, 3) * 4);
        const dur = 0.45 + rnd(i, 4) * 0.35;
        const delay = 0.1 + rnd(i, 5) * 0.35;
        const from = -sign * 130, to = sign * 130;
        return (
          <motion.span
            key={i}
            className="sg-dash"
            style={horizontal ? { top: `${pos}%`, left: `-${len}px`, width: len, height: thick } : { left: `${pos}%`, top: `-${len}px`, height: len, width: thick }}
            initial={horizontal ? { x: `${from}vw`, opacity: 0 } : { y: `${from}vh`, opacity: 0 }}
            animate={horizontal ? { x: [`${from}vw`, `${to}vw`], opacity: [0, 1, 1, 0] } : { y: [`${from}vh`, `${to}vh`], opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, ease: 'linear', delay }}
          />
        );
      })}
    </div>
  );
}

/* ---------- pages ---------- */

function BackSign({ label, onClick }: { label: string; onClick: () => void }) {
  const pts: [number, number][] = [[8, 34], [46, 6], [254, 6], [240, 34], [254, 62], [46, 62]];
  return (
    <button type="button" className="sg-back" onClick={onClick}>
      <svg viewBox="0 0 270 80" width="270" height="80" aria-hidden="true">
        <Rough kind="poly" points={pts.map(([a, b]) => [a + 6, b + 7])} seed={76} opts={shadow(76)} />
        <Rough kind="poly" points={[[46, 62], [254, 62], [254, 70], [46, 70], [8, 42]]} seed={78} opts={{ ...tone(78, TONE_DARK), stroke: '#111', strokeWidth: 1.6 }} />
        <Rough kind="poly" points={pts} seed={77} opts={outline(3, 77)} />
      </svg>
      <span>{label}</span>
    </button>
  );
}

function ArtWall({ section, onOpen, onBack }: { section: string; onOpen: (v: { image: string; caption: string; materials?: string[] }) => void; onBack: () => void }) {
  const s = ART.find((x) => x.id === section);
  const items = s?.items ?? [];
  // the row drifts along by itself; the pictures are laid out twice so it can loop without a seam
  const loop = items.length > 2;
  const row = useAutoScroll(loop, section);
  if (!s) return null;
  const shown = loop ? [...items, ...items] : items;
  return (
    <div className="sg-wall">
      <BackSign label="My art" onClick={onBack} />
      <h1 className="sg-wall-title">{s.label}</h1>
      <div className={`sg-frames sg-frames-row${loop ? ' sg-frames-loop' : ''}`} ref={row}>
        {shown.map((it, k) => {
          const i = k % items.length;
          return (
            <HangingSign key={`${it.image}-${k}`} index={i} w={300} ratio={it.ratio} string={170 + (i % 3) * 58} seed={100 + i * 7} onClick={() => onOpen({ image: it.image, caption: it.caption, materials: it.materials })} className="hg-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={base() + it.image} alt={it.caption} loading="lazy" draggable={false} />
              <span className="hg-caption">{it.caption}</span>
            </HangingSign>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Scrolls a row forever (about 57 px/s), wrapping at the halfway point of the
 * doubled content so the loop is seamless. Pauses only while a finger is on it,
 * and does nothing under prefers-reduced-motion.
 */
function useAutoScroll(enabled: boolean, key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let paused = false;
    let resume = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!paused && el.scrollWidth > el.clientWidth + 10) {
        carry += 57 * dt;
        const step = Math.floor(carry);
        if (step) {
          carry -= step;
          const half = el.scrollWidth / 2;
          const next = el.scrollLeft + step;
          el.scrollLeft = next >= half ? next - half : next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const hold = () => {
      paused = true;
      window.clearTimeout(resume);
    };
    const release = (after = 0) => {
      window.clearTimeout(resume);
      resume = window.setTimeout(() => {
        paused = false;
        last = performance.now();
      }, after);
    };
    // hovering does not stop the drift; only a finger on the row (scrolling it by hand) does
    const onEnter = () => {};
    const onLeave = () => {};
    const onTouchStart = () => hold();
    const onTouchEnd = () => release(2500);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    raf = requestAnimationFrame((t) => {
      last = t;
      tick(t);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resume);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, key]);
  return ref;
}

function Contact({ onBack }: { onBack: () => void }) {
  return (
    <div className="sg-wall sg-contact">
      <BackSign label="Home" onClick={onBack} />
      <SignChain
        seed={200}
        items={[{ id: 'title', label: 'Contact me', title: true }, ...CONTACTS.map((c) => ({ id: c.id, label: c.label, sub: c.handle, href: c.href }))]}
      />
    </div>
  );
}

function Cards({ group, onBack, onOpen }: { group: string; onBack: () => void; onOpen: (c: Card) => void }) {
  const g = PROJECT_GROUPS.find((x) => x.id === group);
  if (!g) return null;
  return (
    <div className="sg-wall">
      <BackSign label="My projects" onClick={onBack} />
      <h1 className="sg-wall-title">{g.label}</h1>
      <ul className="sg-cards">
        {g.cards.map((c, i) => (
          <ProjectCard key={c.id} card={c} index={i} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  );
}

function ProjectCard({ card, index, onOpen }: { card: Card; index: number; onOpen: (c: Card) => void }) {
  const body = (
    <>
      <svg className="sg-card-border" viewBox="0 0 320 400" preserveAspectRatio="none" aria-hidden="true">
        <Rough kind="rect" x={14} y={14} w={300} h={380} seed={300 + index} opts={shadow(300 + index)} />
        <Rough kind="rect" x={4} y={4} w={300} h={380} seed={310 + index} opts={outline(3, 310 + index)} />
        {/* strips of tape across the top corners, hanging over the edge onto the paper */}
        <g transform="rotate(-32 30 4)">
          <Rough kind="rect" x={-8} y={-8} w={76} h={22} seed={320 + index} opts={{ stroke: 'rgba(17,17,17,0.55)', strokeWidth: 1.6, roughness: 1, fill: 'rgba(228,228,228,0.85)', fillStyle: 'solid' }} />
        </g>
        <g transform="rotate(32 278 4)">
          <Rough kind="rect" x={240} y={-8} w={76} h={22} seed={330 + index} opts={{ stroke: 'rgba(17,17,17,0.55)', strokeWidth: 1.6, roughness: 1, fill: 'rgba(228,228,228,0.85)', fillStyle: 'solid' }} />
        </g>
      </svg>
      <div className="sg-card-body">
        {card.image && (
          <div className="sg-card-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base() + card.image} alt="" loading="lazy" draggable={false} />
          </div>
        )}
        <h2>{card.title}</h2>
        <p>{card.line}</p>
        <ul className="sg-chips">
          {card.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <span className="sg-card-link">{card.images.length > 1 ? `${card.images.length} photos` : 'Open'} →</span>
      </div>
    </>
  );
  return (
    <motion.li className="sg-card" initial={{ y: 80, opacity: 0, rotate: 3 }} animate={{ y: 0, opacity: 1, rotate: index % 2 ? 1.2 : -1.2 }} transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.6 + index * 0.08 }}>
      <button type="button" onClick={() => onOpen(card)} aria-label={`Open ${card.title}`}>{body}</button>
    </motion.li>
  );
}

/* ---------- project viewer: a framed photo you can page through, with the write-up under it ---------- */

function ProjectView({ card, onClose }: { card: Card; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const n = card.images.length;
  const step = useCallback(
    (d: number) => {
      if (n < 2) return;
      setDir(d);
      setI((k) => (k + d + n) % n);
    },
    [n],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);
  const shot = card.images[i];
  const drag = useRef<number | null>(null);
  return (
    <motion.div className="sg-lightbox sg-project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.article
        className="sg-pv"
        initial={{ scale: 0.8, rotate: -2, y: 30 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sg-pv-frame"
          onPointerDown={(e) => {
            drag.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (drag.current !== null && Math.abs(e.clientX - drag.current) > 40) step(e.clientX < drag.current ? 1 : -1);
            drag.current = null;
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            {shot ? (
              <motion.figure
                key={shot.src}
                custom={dir}
                initial={{ x: dir * 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -dir * 80, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={base() + shot.src} alt={shot.caption} draggable={false} />
                <figcaption>
                  {shot.caption}
                  {shot.credit && !shot.credit.startsWith('own') && (
                    <>
                      {' '}
                      <a href={shot.credit} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        (source)
                      </a>
                    </>
                  )}
                </figcaption>
              </motion.figure>
            ) : (
              <p className="sg-pv-empty">No photos yet</p>
            )}
          </AnimatePresence>
          {n > 1 && (
            <>
              <button type="button" className="sg-pv-arrow sg-pv-prev" onClick={() => step(-1)} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className="sg-pv-arrow sg-pv-next" onClick={() => step(1)} aria-label="Next photo">
                ›
              </button>
              <span className="sg-pv-count">
                {i + 1} / {n}
              </span>
            </>
          )}
        </div>
        <div className="sg-pv-text">
          <h2>{card.title}</h2>
          <p className="sg-pv-line">{card.line}</p>
          {card.study ? (
            <CaseStudy study={card.study} />
          ) : (
            <>
              {card.notes.length > 0 && (
                <ul className="sg-pv-notes">
                  {card.notes.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              <ul className="sg-chips">
                {card.stack.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
          {card.href && (
            <a className="sg-pv-link" href={card.href} target="_blank" rel="noreferrer">
              Open project ↗
            </a>
          )}
        </div>
        <button type="button" className="sg-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </motion.article>
    </motion.div>
  );
}

/* ---------- case study: problem, what I built, how, my part, challenges, results, tech ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sg-cs">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function CaseStudy({ study }: { study: Study }) {
  return (
    <div className="sg-study">
      <Section title="Problem">
        <p>{study.problem}</p>
      </Section>
      <Section title="What I built">
        <p>{study.built}</p>
      </Section>
      <Section title="How it works">
        <ul>
          {study.how.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {study.snippet && (
          <figure className="sg-code">
            <pre>
              <code>{study.snippet.code}</code>
            </pre>
            <figcaption>{study.snippet.note}</figcaption>
          </figure>
        )}
      </Section>
      <Section title="My contribution">
        <p>{study.contribution}</p>
      </Section>
      <Section title="Technical challenges">
        <ul>
          {study.challenges.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Section>
      <Section title="Results">
        <ul className="sg-cs-results">
          {study.results.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Section>
      <Section title="Tech">
        <ul className="sg-chips">
          {study.tech.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

/* ---------- torn remnant: the strip left under the rings when the sheet above is ripped away, drawn right to left ---------- */

function TornRemnant() {
  const pts = TORN.map((y, i) => `${((i / (TORN.length - 1)) * 100).toFixed(2)},${(y * 8).toFixed(1)}`).join(' ');
  return (
    <motion.div className="sg-remnant" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: TEAR * 0.55, ease: 'linear' }}>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        <polygon points={`0,0 100,0 ${pts}`} fill="#fff" stroke="#111" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
      </svg>
    </motion.div>
  );
}

/* ---------- the name: big on the landing page, shrinks into the top-left corner on the about page ---------- */

function NameTag({ page, onHome }: { page: Route['page']; onHome: () => void }) {
  const mode = page === 'home' ? 'home' : page === 'about' ? 'corner' : 'hidden';
  return (
    <motion.h1
      layout
      className={`nt nt-${mode}`}
      transition={{ layout: { type: 'spring', stiffness: 120, damping: 18 } }}
      animate={{ opacity: mode === 'hidden' ? 0 : 1 }}
      initial={false}
    >
      {mode === 'corner' ? (
        <button type="button" className="nt-btn" onClick={onHome} aria-label="Home">
          {NAME}
        </button>
      ) : (
        <span>{NAME}</span>
      )}
    </motion.h1>
  );
}

/* ---------- about page: a line about me, a paragraph, a photo, and where I am ---------- */

function About({ onBack }: { onBack: () => void }) {
  return (
    <div className="sg-wall sg-about">
      <BackSign label="Home" onClick={onBack} />
      <div className="ab">
        <motion.div className="ab-text" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}>
          <p className="ab-tagline">{ABOUT.tagline}</p>
          {ABOUT.paragraphs.map((p) => (
            <p key={p} className="ab-para">
              {p}
            </p>
          ))}
        </motion.div>
        <motion.figure
          className="ab-photo"
          initial={{ y: 40, opacity: 0, rotate: 8 }}
          animate={{ y: 0, opacity: 1, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.6 }}
          whileHover={{ rotate: 0, scale: 1.04, y: -6 }}
        >
          <span className="ld-tape ld-tape-l" aria-hidden="true" />
          <span className="ld-tape ld-tape-r" aria-hidden="true" />
          <span className="ld-photo-pic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={base() + ABOUT.photo}
              alt="Nathan"
              draggable={false}
              onError={(e) => {
                const fig = e.currentTarget.closest('figure');
                if (fig) (fig as HTMLElement).style.display = 'none';
              }}
            />
          </span>
          <figcaption className="ld-photo-caption">me</figcaption>
        </motion.figure>
        <motion.div
          className="ab-based"
          initial={{ scale: 0.6, opacity: 0, rotate: 10 }}
          animate={{ scale: 1, opacity: 1, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.9 }}
          whileHover={{ rotate: 0, scale: 1.06 }}
        >
          <span className="note-shadow" aria-hidden="true" />
          <span className="note-paper" aria-hidden="true" />
          <span className="note-tape" aria-hidden="true" />
          <span className="ab-based-text">
            <span className="ab-pin" aria-hidden="true">
              ⌖
            </span>
            {ABOUT.based}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
