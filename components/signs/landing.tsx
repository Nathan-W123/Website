'use client';

import { motion } from 'motion/react';
import { PencilDefs } from '@/components/sketch/rough';
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { ART, PROJECT_GROUPS, RECENT, type Card } from './content';
import { GALLERY } from './gallery';
import type { Plank } from './signpost';

/**
 * Landing page: the name written in pencil near the top, two photos taped to
 * the paper (my art, my projects) and a sticky note for getting in touch.
 * Everything here is a link; the swipe direction is passed on through
 * `onGo` the same way the signpost planks do it.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

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

const cardById = (id: string) => PROJECT_GROUPS.flatMap((g) => g.cards).find((c) => c.id === id);

export function Landing({ onGo, onOpenProject, onOpenArt }: { onGo: (p: Plank) => void; onOpenProject: (c: Card) => void; onOpenArt: (v: { image: string; caption: string; materials?: string[] }) => void }) {
  // a fresh random pair next time the landing page is shown
  useEffect(() => () => picks.clear(), []);
  return (
    <div className="ld">
      <section className="ld-hero">
      <PencilDefs />
      {/* the name itself lives at the root (NameTag) so it can travel to the corner on the about page */}
      <div className="ld-name-space" aria-hidden="true" />
      <div className="ld-row">
        <Photo title="my art" pool={ART_POOL} href="#/art" tilt={-4} delay={0.5} onGo={onGo} plank={{ label: 'My art', dir: 'right', href: '#/art' }} />
        <Photo title="my projects" pool={PROJECT_POOL} href="#/projects" tilt={3} delay={0.65} onGo={onGo} plank={{ label: 'My projects', dir: 'left', href: '#/projects' }} />
      </div>
      {/* the cue to scroll: highlighted like a marker stroke, arrow bobbing */}
      <motion.a
        className="ld-cue"
        href="#bench"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('bench')?.scrollIntoView({ behavior: 'smooth' });
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        whileHover={{ scale: 1.04 }}
      >
        <span className="ld-cue-text">things I&apos;ve been building</span>
        <motion.span className="ld-cue-arrow" animate={{ y: [0, 9, 0] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}>
          ↓
        </motion.span>
      </motion.a>
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
      </section>

      {/* the bench: most recent things, just finished or in progress */}
      <section className="ld-bench" id="bench">
        <div className="ld-bench-row">
          {RECENT.map((r, i) => {
            const tilt = [-3, 2.5, -2][i % 3];
            if (r.kind === 'project') {
              const card = cardById(r.id);
              if (!card) return null;
              return (
                <motion.button
                  key={r.id}
                  type="button"
                  className="ld-bench-item"
                  style={{ ['--tilt' as string]: `${tilt}deg` } as CSSProperties}
                  onClick={() => onOpenProject(card)}
                  initial={{ y: 40, opacity: 0, rotate: tilt - 5 }}
                  whileInView={{ y: 0, opacity: 1, rotate: tilt }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ type: 'spring', stiffness: 140, damping: 16, delay: i * 0.12 }}
                  whileHover={{ rotate: 0, scale: 1.05, y: -8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="ld-tape ld-tape-l" aria-hidden="true" />
                  <span className="ld-tape ld-tape-r" aria-hidden="true" />
                  <span className="ld-bench-pic">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {card.image && <img src={base() + card.image} alt="" draggable={false} />}
                  </span>
                  <span className="ld-bench-name">{card.title}</span>
                  <span className="ld-bench-line">{card.line}</span>
                  <span className="ld-status">{r.status}</span>
                </motion.button>
              );
            }
            const item = ART.find((s) => s.id === r.section)?.items.find((it) => it.image === r.image);
            return (
              <motion.button
                key={r.image}
                type="button"
                className="ld-bench-item"
                style={{ ['--tilt' as string]: `${tilt}deg` } as CSSProperties}
                onClick={() => onOpenArt({ image: r.image, caption: item?.caption ?? r.title, materials: item?.materials })}
                initial={{ y: 40, opacity: 0, rotate: tilt - 5 }}
                whileInView={{ y: 0, opacity: 1, rotate: tilt }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 140, damping: 16, delay: i * 0.12 }}
                whileHover={{ rotate: 0, scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="ld-tape ld-tape-l" aria-hidden="true" />
                <span className="ld-tape ld-tape-r" aria-hidden="true" />
                <span className="ld-bench-pic">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={base() + r.image} alt="" draggable={false} />
                </span>
                <span className="ld-bench-name">{r.title}</span>
                <span className="ld-bench-line">hand-painted Air Force 1s</span>
                <span className="ld-status">{r.status}</span>
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
