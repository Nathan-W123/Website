'use client';

import { motion, useReducedMotion } from 'motion/react';
import { PencilDefs } from '@/components/sketch/rough';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { ART, RECENT, type Card, type RecentItem } from './content';
import { GALLERY } from './gallery';
import type { Plank } from './signpost';

/**
 * Landing page: the name written in pencil near the top, two photos taped to
 * the paper (my art, my projects) and a sticky note for getting in touch.
 * Everything here is a link; the swipe direction is passed on through
 * `onGo` the same way the signpost planks do it.
 *
 * Under the photos a pencil line points down the page: one more screen of
 * scrolling holds the things I am building right now, each one opening the same
 * viewer the projects and art pages use.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

export type Lightbox = { image: string; caption: string; materials?: string[] };

/** Each photo shows one picture, picked at random per visit from everything on the site. */
const ART_POOL = ART.flatMap((s) => s.items.map((it) => it.image));
// project pictures, not plots: app screens, renders and game shots only
const PROJECT_POOL = ['/projects/black-hole/1.webp', '/projects/black-hole/2.webp', '/projects/aero/1.webp', '/projects/aero/2.webp', '/projects/aero/4.webp', '/projects/gambit/1.webp', '/projects/siege/1.webp', '/projects/siege/2.webp', '/projects/kumi/1.webp', '/projects/kumi/2.webp', '/projects/voice-agents/1.webp', '/projects/hf-scf/1.webp', '/projects/hf-scf/2.webp', '/projects/nonstandard/2.webp', '/projects/nonstandard/3.webp'].filter((p) => Object.values(GALLERY).some((g) => g.some((sh) => sh.src === p)));
// picks are made on the client only (the server renders the first picture), and forgotten when the page unmounts
const picks = new Map<string, number>();
const pick = (key: string, n: number) => {
  let v = picks.get(key);
  if (v === undefined) {
    v = Math.floor(Math.random() * n);
    picks.set(key, v);
  }
  return v;
};
const noop = () => () => {};
function useRandomPick(key: string, n: number) {
  return useSyncExternalStore(noop, () => pick(key, n), () => 0);
}

function Photo({ title, pool, href, tilt, delay, onGo, plank }: { title: string; pool: string[]; href: string; tilt: number; delay: number; onGo: (p: Plank) => void; plank: Plank }) {
  const src = pool[useRandomPick(title, pool.length)] ?? pool[0];
  return (
    <motion.a
      className="ld-photo"
      href={href}
      style={{ ['--tilt' as string]: `${tilt}deg` } as CSSProperties}
      onClick={() => onGo(plank)}
      initial={{ y: 40, opacity: 0, rotate: tilt - 6 }}
      animate={{ y: 0, opacity: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 140, damping: 16, delay }}
      whileHover={{ rotate: -tilt * 0.6, scale: 1.07, y: -12, transition: { type: 'spring', stiffness: 300, damping: 12 } }}
      whileTap={{ scale: 0.97, rotate: tilt }}
    >
      <span className="ld-tape ld-tape-l" aria-hidden="true" />
      <span className="ld-tape ld-tape-r" aria-hidden="true" />
      <span className="ld-photo-pic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={base() + src} alt="" draggable={false} />
      </span>
      <span className="ld-photo-caption">{title}</span>
    </motion.a>
  );
}

/**
 * One thing I am building: a taped card with the cover picture, a stamp saying
 * where it is up to, and the same viewer behind it as the projects and art
 * pages. The cards rise into place as they are scrolled into view.
 */
function RecentCard({ item, index, onOpenProject, onOpenArt }: { item: RecentItem; index: number; onOpenProject: (c: Card) => void; onOpenArt: (v: Lightbox) => void }) {
  const tilt = [-2.2, 1.8, -1.4][index % 3];
  const open = () => {
    if (item.card) onOpenProject(item.card);
    else if (item.art) onOpenArt({ image: item.art.image, caption: item.title, materials: item.art.materials });
  };
  return (
    <motion.li
      className="ld-rc-item"
      initial={{ y: 44, opacity: 0, rotate: tilt - 5 }}
      whileInView={{ y: 0, opacity: 1, rotate: tilt }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: 'spring', stiffness: 150, damping: 17, delay: index * 0.09 }}
    >
      <button type="button" className="ld-rc" onClick={open}>
        <span className="ld-tape ld-tape-l" aria-hidden="true" />
        <span className="ld-tape ld-tape-r" aria-hidden="true" />
        <span className="ld-rc-pic">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={base() + item.image} alt="" loading="lazy" draggable={false} />
        </span>
        <span className="ld-rc-stamp">{item.status}</span>
        <span className="ld-rc-title">{item.title}</span>
        <span className="ld-rc-line">{item.line}</span>
      </button>
    </motion.li>
  );
}

export function Landing({ onGo, onOpenProject, onOpenArt, onScrolled }: { onGo: (p: Plank) => void; onOpenProject: (c: Card) => void; onOpenArt: (v: Lightbox) => void; onScrolled?: (v: boolean) => void }) {
  // a fresh random pair next time the landing page is shown
  useEffect(() => () => picks.clear(), []);
  const reduced = useReducedMotion();
  const hero = useRef<HTMLDivElement>(null);
  const recent = useRef<HTMLElement>(null);
  // past the first screen the pencil name and the scroll cue get out of the way
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const page = hero.current?.closest('.sg-page');
    if (!page) return;
    const read = () => {
      const v = page.scrollTop > 40;
      setScrolled(v);
      onScrolled?.(v);
    };
    read();
    page.addEventListener('scroll', read, { passive: true });
    return () => {
      page.removeEventListener('scroll', read);
      onScrolled?.(false);
    };
  }, [onScrolled]);
  const toRecent = useCallback(() => {
    recent.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [reduced]);

  return (
    <>
      <PencilDefs />
      <div className="ld" ref={hero}>
        {/* the name itself lives at the root (NameTag) so it can travel to the corner on the about page */}
        <div className="ld-name-space" aria-hidden="true" />
        <div className="ld-row">
          <Photo title="my art" pool={ART_POOL} href="#/art" tilt={-4} delay={0.5} onGo={onGo} plank={{ label: 'My art', dir: 'right', href: '#/art' }} />
          <Photo title="my projects" pool={PROJECT_POOL} href="#/projects" tilt={3} delay={0.65} onGo={onGo} plank={{ label: 'My projects', dir: 'left', href: '#/projects' }} />
        </div>
        {/* about me: a strip of tape stuck to the page that opens the about page */}
        <motion.a
          className="ld-tapelink"
          href="#/about"
          onClick={() => onGo({ label: 'About me', dir: 'right', href: '#/about' })}
          data-mode="fade"
          initial={{ y: 20, opacity: 0, rotate: -9 }}
          animate={{ y: 0, opacity: 1, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 160, damping: 15, delay: 0.85 }}
          whileHover={{ rotate: -1, scale: 1.08, y: -4, transition: { type: 'spring', stiffness: 320, damping: 12 } }}
          whileTap={{ scale: 0.97 }}
        >
          about me
        </motion.a>
        <motion.a
          className="ld-sticky"
          href="#/contact"
          onClick={() => onGo({ label: 'Contact me', dir: 'left', href: '#/contact' })}
          initial={{ scale: 0.6, opacity: 0, rotate: 12 }}
          animate={{ scale: 1, opacity: 1, rotate: 4 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 1 }}
          whileHover={{ rotate: -3, scale: 1.1, y: -10, transition: { type: 'spring', stiffness: 320, damping: 11 } }}
          whileTap={{ scale: 0.96, rotate: 4 }}
        >
          <span className="note-shadow" aria-hidden="true" />
          <span className="note-paper" aria-hidden="true" />
          <span className="note-tape" aria-hidden="true" />
          <span className="ld-sticky-text">contact me</span>
        </motion.a>
        {/* written in the margin under the photos: a pencil line pointing down the page */}
        <motion.button
          type="button"
          className="ld-cue"
          onClick={toRecent}
          // out of the way once it has been used: not clickable, not in the tab order
          style={{ pointerEvents: scrolled ? 'none' : 'auto' }}
          tabIndex={scrolled ? -1 : undefined}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: scrolled ? 0 : 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: scrolled ? 0 : 1.15 }}
        >
          <span className="ld-cue-text">things i&rsquo;ve been building</span>
          <motion.span
            className="ld-cue-arrow"
            aria-hidden="true"
            animate={reduced ? { y: 0 } : { y: [0, 9, 0] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
          >
            ↓
          </motion.span>
        </motion.button>
      </div>

      <section className="ld-recent" ref={recent} aria-labelledby="ld-recent-title">
        <h2 className="ld-recent-title" id="ld-recent-title">
          recent work
        </h2>
        <ul className="ld-recent-row">
          {RECENT.map((item, i) => (
            <RecentCard key={item.key} item={item} index={i} onOpenProject={onOpenProject} onOpenArt={onOpenArt} />
          ))}
        </ul>
        <motion.a
          className="ld-recent-all"
          href="#/projects"
          onClick={() => onGo({ label: 'My projects', dir: 'left', href: '#/projects' })}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          whileHover={{ x: -2, y: -2 }}
        >
          everything else →
        </motion.a>
      </section>
    </>
  );
}
