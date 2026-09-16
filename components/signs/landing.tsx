'use client';

import { motion } from 'motion/react';
import { PencilDefs } from '@/components/sketch/rough';
import type { CSSProperties } from 'react';
import type { Plank } from './signpost';

/**
 * Landing page: the name written in pencil near the top, two photos taped to
 * the paper (my art, my projects) and a sticky note for getting in touch.
 * Everything here is a link; the swipe direction is passed on through
 * `onGo` the same way the signpost planks do it.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

const ART_TILES = ['/art/doodles/dragon.webp', '/art/shoes/wave-dragon.webp', '/art/doodles/elephant.webp', '/art/shoes/blue-doodle.webp'];
const PROJECT_TILES = ['/projects/black-hole/1.webp', '/projects/aero/1.webp', '/projects/gambit/1.webp', '/projects/siege/2.webp'];

function Photo({ title, tiles, href, tilt, delay, onGo, plank }: { title: string; tiles: string[]; href: string; tilt: number; delay: number; onGo: (p: Plank) => void; plank: Plank }) {
  return (
    <motion.a
      className="ld-photo"
      href={href}
      style={{ ['--tilt' as string]: `${tilt}deg` } as CSSProperties}
      onClick={() => onGo(plank)}
      initial={{ y: 40, opacity: 0, rotate: tilt - 6 }}
      animate={{ y: 0, opacity: 1, rotate: tilt }}
      transition={{ type: 'spring', stiffness: 140, damping: 16, delay }}
      whileHover={{ rotate: 0, scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="ld-tape ld-tape-l" aria-hidden="true" />
      <span className="ld-tape ld-tape-r" aria-hidden="true" />
      <span className="ld-photo-grid">
        {tiles.map((t) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={t} src={base() + t} alt="" draggable={false} />
        ))}
      </span>
      <span className="ld-photo-caption">{title}</span>
    </motion.a>
  );
}

export function Landing({ name, onGo }: { name: string; onGo: (p: Plank) => void }) {
  return (
    <div className="ld">
      <PencilDefs />
      {/* the name, written in pencil: the reveal sweeps left to right like a hand writing it */}
      <motion.h1 className="ld-name" initial={{ clipPath: 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 1.3, ease: 'easeInOut', delay: 0.2 }}>
        <span>{name}</span>
      </motion.h1>
      <div className="ld-row">
        <Photo title="my art" tiles={ART_TILES} href="#/art" tilt={-3} delay={0.5} onGo={onGo} plank={{ label: 'My art', dir: 'right', href: '#/art' }} />
        <Photo title="my projects" tiles={PROJECT_TILES} href="#/projects" tilt={2.5} delay={0.65} onGo={onGo} plank={{ label: 'My projects', dir: 'left', href: '#/projects' }} />
      </div>
      <motion.a
        className="ld-sticky"
        href="#/contact"
        onClick={() => onGo({ label: 'Contact me', dir: 'left', href: '#/contact' })}
        initial={{ scale: 0.6, opacity: 0, rotate: 12 }}
        animate={{ scale: 1, opacity: 1, rotate: 4 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 1 }}
        whileHover={{ rotate: 0, scale: 1.06 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="ld-sticky-tape" aria-hidden="true" />
        <span className="ld-sticky-text">contact me</span>
        <span className="ld-sticky-sub">insta · linkedin · github · email →</span>
      </motion.a>
    </div>
  );
}
