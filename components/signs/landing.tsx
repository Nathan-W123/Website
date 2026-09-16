'use client';

import { motion } from 'motion/react';
import { PencilDefs } from '@/components/sketch/rough';
import { useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { ART } from './content';
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
const PROJECT_POOL = Object.values(GALLERY).map((g) => g[0]?.src).filter((x): x is string => !!x);
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

export function Landing({ name, onGo }: { name: string; onGo: (p: Plank) => void }) {
  // a fresh random pair next time the landing page is shown
  useEffect(() => () => picks.clear(), []);
  return (
    <div className="ld">
      <PencilDefs />
      {/* the name, written in pencil: the reveal sweeps left to right like a hand writing it */}
      <motion.h1 className="ld-name" initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 1.3, ease: 'easeInOut', delay: 0.2 }}>
        <span>{name}</span>
      </motion.h1>
      <div className="ld-row">
        <Photo title="my art" pool={ART_POOL} href="#/art" tilt={-3} delay={0.5} onGo={onGo} plank={{ label: 'My art', dir: 'right', href: '#/art' }} />
        <Photo title="my projects" pool={PROJECT_POOL} href="#/projects" tilt={2.5} delay={0.65} onGo={onGo} plank={{ label: 'My projects', dir: 'left', href: '#/projects' }} />
      </div>
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
        <span className="ld-sticky-sub">insta · linkedin · github · email →</span>
      </motion.a>
    </div>
  );
}
