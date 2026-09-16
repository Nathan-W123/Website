'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Rough } from '@/components/sketch/rough';
import { ART, CONTACTS, NAME, PROJECT_GROUPS, type Card } from './content';
import { SignChain } from './chain';
import { HangingSign } from './hanging';
import { TONE, TONE_DARK, outline, shadow, tone } from './ink';
import { Signpost, type Plank } from './signpost';
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
type Route = { page: 'home' } | { page: 'art'; section?: string } | { page: 'projects'; group?: string } | { page: 'contact' };

const parse = (hash: string): Route => {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'art') return { page: 'art', section: parts[1] };
  if (parts[0] === 'projects') return { page: 'projects', group: parts[1] };
  if (parts[0] === 'contact') return { page: 'contact' };
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
const ease = [0.7, 0, 0.3, 1] as const;
const variants: Variants = {
  enter: (d: Dir) => ({ x: d === 'left' ? `${FAR}vw` : d === 'right' ? `-${FAR}vw` : 0, y: d === 'up' ? `${FAR}vh` : d === 'down' ? `-${FAR}vh` : 0, scale: 0.9 }),
  center: { x: 0, y: 0, scale: 1 },
  exit: (d: Dir) => ({ x: d === 'left' ? `-${FAR}vw` : d === 'right' ? `${FAR}vw` : 0, y: d === 'up' ? `-${FAR}vh` : d === 'down' ? `${FAR}vh` : 0, scale: 0.9 }),
};

export default function Signs() {
  const [route, setRoute] = useState<Route>({ page: 'home' });
  const [dir, setDir] = useState<Dir>('left');
  const [swipe, setSwipe] = useState<{ id: number; dir: Dir } | null>(null);
  const [lightbox, setLightbox] = useState<{ image: string; caption: string } | null>(null);
  const [project, setProject] = useState<Card | null>(null);
  // the direction a plank was clicked in, consumed by the next hash change
  const pending = useRef<Dir | null>(null);
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
      pending.current = null;
      routeRef.current = next;
      setDir(d);
      setRoute(next);
      if (!first.current) setSwipe({ id: ++swipes.current, dir: d });
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
  }, []);
  const go = useCallback((hash: string) => {
    window.location.hash = hash;
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
    <div className="sg-root">
      <AnimatePresence mode="sync" custom={dir} initial={false}>
        <motion.section
          key={routeKey(route)}
          className="sg-page"
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: SWIPE, ease }}
        >
          {route.page === 'home' && (
            <div className="sg-center">
              <Signpost
                title={NAME}
                seed={1}
                onPlank={onPlank}
                planks={[
                  { label: 'Contact me', dir: 'left', href: '#/contact' },
                  { label: 'My art', dir: 'right', href: '#/art' },
                  { label: 'My projects', dir: 'left', href: '#/projects' },
                ]}
              />
            </div>
          )}

          {route.page === 'art' && !route.section && (
            <div className="sg-center">
              <Signpost
                title="My art"
                seed={11}
                onPlank={onPlank}
                planks={[
                  { label: 'Home', dir: 'left', href: '#/', small: true },
                  ...ART.map((s, i) => ({ label: s.label, dir: (i % 2 === 0 ? 'right' : 'left') as 'left' | 'right', href: `#/art/${s.id}` })),
                ]}
              />
            </div>
          )}

          {route.page === 'art' && route.section && (
            <ArtWall section={route.section} onOpen={setLightbox} onBack={() => go('#/art')} />
          )}

          {route.page === 'projects' && !route.group && (
            <div className="sg-center">
              <Signpost
                title="My projects"
                seed={21}
                onPlank={onPlank}
                planks={[
                  { label: 'Home', dir: 'right', href: '#/', small: true },
                  ...PROJECT_GROUPS.map((g, i) => ({ label: g.label, dir: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right', href: `#/projects/${g.id}` })),
                ]}
              />
            </div>
          )}

          {route.page === 'projects' && route.group && <Cards group={route.group} onBack={() => go('#/projects')} onOpen={setProject} />}

          {route.page === 'contact' && <Contact onBack={() => go('#/')} />}
        </motion.section>
      </AnimatePresence>

      {swipe && <Dashes key={swipe.id} dir={swipe.dir} />}

      <AnimatePresence>{project && <ProjectView key={project.id} card={project} onClose={() => setProject(null)} />}</AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div className="sg-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            <motion.figure initial={{ scale: 0.7, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.8 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} onClick={(e) => e.stopPropagation()}>
              <div className="sg-lightbox-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={base() + lightbox.image} alt={lightbox.caption} />
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
  const pts: [number, number][] = [[8, 34], [46, 6], [214, 6], [200, 34], [214, 62], [46, 62]];
  return (
    <button type="button" className="sg-back" onClick={onClick}>
      <svg viewBox="0 0 230 80" width="230" height="80" aria-hidden="true">
        <Rough kind="poly" points={pts.map(([a, b]) => [a + 6, b + 7])} seed={76} opts={shadow(76)} />
        <Rough kind="poly" points={[[46, 62], [214, 62], [214, 70], [46, 70], [8, 42]]} seed={78} opts={{ ...tone(78, TONE_DARK), stroke: '#111', strokeWidth: 1.6 }} />
        <Rough kind="poly" points={pts} seed={77} opts={outline(3, 77)} />
      </svg>
      <span>{label}</span>
    </button>
  );
}

function ArtWall({ section, onOpen, onBack }: { section: string; onOpen: (v: { image: string; caption: string }) => void; onBack: () => void }) {
  const s = ART.find((x) => x.id === section);
  if (!s) return null;
  return (
    <div className="sg-wall">
      <BackSign label="My art" onClick={onBack} />
      <h1 className="sg-wall-title">{s.label}</h1>
      <div className="sg-frames sg-frames-row">
        {s.items.map((it, i) => (
          <HangingSign key={it.image} index={i} w={270} ratio={it.ratio} string={110 + (i % 3) * 46} seed={100 + i * 7} onClick={() => onOpen({ image: it.image, caption: it.caption })} className="hg-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base() + it.image} alt={it.caption} loading="lazy" draggable={false} />
            <span className="hg-caption">{it.caption}</span>
          </HangingSign>
        ))}
      </div>
    </div>
  );
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
        {/* strips of tape over the top corners */}
        <g transform="rotate(-28 40 8)">
          <Rough kind="rect" x={12} y={0} w={56} h={18} seed={320 + index} opts={{ stroke: '#111', strokeWidth: 1.6, roughness: 1, fill: TONE, fillStyle: 'solid' }} />
        </g>
        <g transform="rotate(30 268 8)">
          <Rough kind="rect" x={240} y={0} w={56} h={18} seed={330 + index} opts={{ stroke: '#111', strokeWidth: 1.6, roughness: 1, fill: TONE, fillStyle: 'solid' }} />
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
