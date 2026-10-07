'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Rough } from '@/components/sketch/rough';
import { ART, CONTACTS, NAME, PROJECT_GROUPS, WORKED_WITH, type Card } from './content';
import { SignChain } from './chain';
import { Doodles } from './doodles';
import { Scribble } from './scribble';
import { HangingSign } from './hanging';
import { Landing } from './landing';
import { About } from './about';
import { IndexCard, StickyBoard } from './notes';
import { ContactIcon } from './icons';
import { TONE_DARK, outline, shadow, tone } from './ink';
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
/** The pages in the new, plain language: no paper, no pencil, no tag. */
const plain = (r: Route) => r.page === 'home' || r.page === 'about';
export default function Signs() {
  const [route, setRoute] = useState<Route>({ page: 'home' });
  const [lightbox, setLightbox] = useState<{ image: string; caption: string; materials?: string[] } | null>(null);
  const [project, setProject] = useState<Card | null>(null);

  const routeRef = useRef<Route>({ page: 'home' });
  const first = useRef(true);

  useEffect(() => {
    const apply = () => {
      const cur = routeRef.current;
      const next = parse(window.location.hash);
      if (routeKey(cur) === routeKey(next) && !first.current) return;
      routeRef.current = next;
      setRoute(next);
      first.current = false;
    };
    apply();
    const closeOverlays = () => {
      setProject(null);
      setLightbox(null);
    };
    window.addEventListener('hashchange', apply);
    window.addEventListener('hashchange', closeOverlays);
    return () => {
      window.removeEventListener('hashchange', apply);
      window.removeEventListener('hashchange', closeOverlays);
    };
  }, []);

  const go = useCallback((hash: string) => {
    window.location.hash = hash;
  }, []);
  const goHome = useCallback(() => {
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
    <div className="sg-root">
      <div className="sg-stage" inert={!!(project || lightbox)}>
      <section className={`sg-page${plain(route) ? ' sg-page--plain' : ''}`}>
          {plain(route) || <Scribble />}
          {plain(route) || <Doodles seed={routeKey(route).length * 7 + 1} />}
          {route.page === 'home' && <Landing onOpenProject={setProject} onOpenArt={setLightbox} />}

          {route.page === 'art' && !route.section && (
            <div className="sg-wall">
              <BackSign label="Home" onClick={goHome} />
              <StickyBoard
                title="my art"
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

          {route.page === 'about' && <About onHome={goHome} />}
      </section>

      <NameTag page={plain(route) ? 'art' : route.page} onHome={goHome} />

      </div>

      <AnimatePresence>{project && <ProjectView key={project.id} card={project} onClose={() => setProject(null)} />}</AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div className="sg-lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- modal behaviour shared by the art lightbox and the project viewer ---------- */

/**
 * Focus moves into the overlay when it opens, Tab stays inside it, and focus
 * goes back to whatever opened it when it closes. The rest of the page is
 * made inert by the shell while an overlay is up.
 */
function useDialog<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  // whatever had focus when the overlay was asked for, read on the first render before focus moves into it
  const [opener] = useState<HTMLElement | null>(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [opener]);
  return ref;
}

function Lightbox({ item, onClose }: { item: { image: string; caption: string; materials?: string[] }; onClose: () => void }) {
  const ref = useDialog<HTMLElement>();
  const lightbox = item;
  // a real <dialog> would need showModal() for its top layer, which fights the motion transitions; the role plus useDialog does the same job
  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
    <motion.figure ref={ref} role="dialog" aria-modal="true" aria-labelledby="sg-lb-caption" tabIndex={-1} initial={{ scale: 0.7, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.8, transition: { duration: 0.2, ease: 'easeIn' } }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} onClick={(e) => e.stopPropagation()}>
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
              <figcaption id="sg-lb-caption">{lightbox.caption}</figcaption>
              <button type="button" className="sg-close" onClick={onClose} aria-label="Close">×</button>
            </motion.figure>
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
            <HangingSign key={`${it.image}-${k}`} index={i} w={300} ratio={it.ratio} string={170 + (i % 3) * 58} seed={100 + i * 7} onClick={() => onOpen({ image: it.image, caption: it.caption, materials: it.materials })} className="hg-frame" decoy={k >= items.length}>
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
  const ref = useDialog<HTMLDivElement>();
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="pv-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
      <motion.div
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="dialog"
        ref={ref}
        aria-modal="true"
        aria-labelledby="pv-title"
        tabIndex={-1}
        className="pv"
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.3, 1] }}
      >
        <button type="button" className="pv-close" onClick={onClose} aria-label="Close">
          Close
        </button>
        <h2 id="pv-title" className="pv-title">
          {card.title}
        </h2>
        <p className="pv-brief">{card.study?.brief ?? card.line}</p>

        {/* two to a row, with every third running the full width */}
        <div className="pv-shots">
          {card.images.map((shot, i) => (
            <figure key={shot.src} className={`pv-shot${i % 3 === 2 ? ' is-wide' : ''}`}>
              {shot.video ? (
                <video
                  poster={base() + shot.src}
                  aria-label={shot.caption}
                  muted
                  loop
                  playsInline
                  autoPlay={!reducedMotion}
                  controls={reducedMotion}
                  preload="metadata"
                >
                  <source src={base() + shot.video + '.webm'} type="video/webm" />
                  <source src={base() + shot.video + '.mp4'} type="video/mp4" />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={base() + shot.src} alt={shot.caption} loading={i < 2 ? undefined : 'lazy'} draggable={false} />
              )}
              {shot.credit && !shot.credit.startsWith('own') && (
                <figcaption>
                  <a href={shot.credit} target="_blank" rel="noreferrer">
                    Image source
                  </a>
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        <ul className="pv-chips">
          {card.stack.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {card.href && (
          <a className="pv-link" href={card.href} target="_blank" rel="noreferrer">
            Open project ↗
          </a>
        )}
      </motion.div>
    </motion.div>
  );
}


/* ---------- torn remnant: the strip left under the rings when the sheet above is ripped away, drawn right to left ---------- */


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
      aria-hidden={mode === 'hidden'}
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

