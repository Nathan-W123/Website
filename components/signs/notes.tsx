'use client';

import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import type { Plank } from './signpost';

/**
 * A board of sticky notes: one note per section, stuck to the paper at
 * slightly different angles. Replaces the second-level signposts (the art
 * sections and the project groups). Each note is a link; the swipe direction
 * is passed on through `onGo` like a signpost plank.
 */

export type Note = { label: string; sub?: string; href: string; dir: 'left' | 'right' };

const TILTS = [-4, 3, -2, 4, -3, 2];

export function StickyBoard({ title, notes, onGo, footer, aside }: { title: string; notes: Note[]; onGo: (p: Plank) => void; footer?: ReactNode; aside?: ReactNode }) {
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
      {footer && (
        <motion.p className="nb-footer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}>
          {footer}
        </motion.p>
      )}
      {aside}
    </div>
  );
}

/** A taped 3x5 index card with a heading and a list, parked in the bottom-left corner. */
export function IndexCard({ title, items }: { title: string; items: string[] }) {
  return (
    <motion.aside className="nb-card" initial={{ y: 30, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: -2.5 }} transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 1.05 }} whileHover={{ rotate: 0, scale: 1.03, y: -4 }}>
      <span className="ld-tape ld-tape-top" aria-hidden="true" />
      <h2>{title}</h2>
      <ul>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </motion.aside>
  );
}
