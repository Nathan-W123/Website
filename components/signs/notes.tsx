'use client';

import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import type { Plank } from './signpost';

/**
 * A board of sticky notes: one note per section, stuck to the paper at
 * slightly different angles. Replaces the second-level signposts (the art
 * sections and the project groups). Each note is a link; the swipe direction
 * is passed on through `onGo` like a signpost plank.
 */

export type Note = { label: string; sub?: string; href: string; dir: 'left' | 'right' };

const TILTS = [-4, 3, -2, 4, -3, 2];

export function StickyBoard({ title, notes, onGo }: { title: string; notes: Note[]; onGo: (p: Plank) => void }) {
  return (
    <div className="nb">
      <h1 className="nb-title">{title}</h1>
      <div className="nb-row">
        {notes.map((n, i) => {
          const tilt = TILTS[i % TILTS.length];
          return (
            <motion.a
              key={n.href}
              className="nb-note"
              href={n.href}
              style={{ ['--tilt' as string]: `${tilt}deg` } as CSSProperties}
              onClick={() => onGo({ label: n.label, dir: n.dir, href: n.href })}
              initial={{ y: -40, opacity: 0, rotate: tilt - 8, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, rotate: tilt, scale: 1 }}
              transition={{ type: 'spring', stiffness: 170, damping: 14, delay: 0.55 + i * 0.1 }}
              whileHover={{ rotate: 0, scale: 1.08, y: -10, transition: { type: 'spring', stiffness: 320, damping: 12 } }}
              whileTap={{ scale: 0.97, rotate: tilt }}
            >
              <span className="note-shadow" aria-hidden="true" />
              <span className="note-paper" aria-hidden="true" />
              <span className="note-tape" aria-hidden="true" />
              <span className="nb-label">{n.label}</span>
              {n.sub && <span className="nb-sub">{n.sub}</span>}
              <span className="nb-go">→</span>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
