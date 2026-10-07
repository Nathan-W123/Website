'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState, type CSSProperties } from 'react';
import { ART, CONTACTS, PROJECT_GROUPS, type ArtItem, type Card } from './content';

/**
 * Home: the name set large, four pieces of work fanned out under it, and a
 * line that says what I am. The pill under that line switches the whole page
 * between the two halves of the portfolio — the word for the side you are on
 * lights up, and the grid below it changes to match. One scroll, no routes.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

type Side = 'engineering' | 'art';

/** The fan, matched to the reference: near-level, heavily overlapped, gently turned,
 *  stacked left to right. x and y are percentages of a card's own width. */
const SEATS = [
  { tilt: -7, x: -88, y: 4, z: 1 },
  { tilt: -2.5, x: -29.5, y: -2, z: 2 },
  { tilt: 2.5, x: 29.5, y: -2, z: 3 },
  { tilt: 7, x: 88, y: 4, z: 4 },
];

/** Four of whichever side you are looking at, cropped to 4:5 and tonally matched
 *  within each set so the fan reads as one group rather than four odd scraps. */
const FAN: Record<Side, string[]> = {
  engineering: ['/hero/eng-1.webp', '/hero/eng-2.webp', '/hero/eng-3.webp', '/hero/eng-4.webp'],
  art: ['/hero/art-1.webp', '/hero/art-2.webp', '/hero/art-3.webp', '/hero/art-4.webp'],
};

const ALL_PROJECTS: Card[] = PROJECT_GROUPS.flatMap((g) => g.cards);
const ALL_ART: (ArtItem & { section: string })[] = ART.flatMap((s) => s.items.map((it) => ({ ...it, section: s.id })));

export function Landing({
  onOpenProject,
  onOpenArt,
}: {
  onOpenProject: (c: Card) => void;
  onOpenArt: (v: { image: string; caption: string; materials?: string[] }) => void;
}) {
  const [side, setSide] = useState<Side>('engineering');
  const reduce = useReducedMotion();

  // the fan settles into place once, with a little overshoot, unless motion is unwanted
  const spring = useMemo(
    () => (reduce ? { duration: 0.01 } : { type: 'spring' as const, stiffness: 260, damping: 16, mass: 0.9 }),
    [reduce],
  );

  return (
    <div className="hm">
      <header className="hm-hero">
        <p className="hm-meta">
          Davis, California
          <a href={`mailto:${CONTACTS.find((c) => c.id === 'email')?.handle}`}>{CONTACTS.find((c) => c.id === 'email')?.handle}</a>
        </p>

        <h1 className="hm-name">Nathan Ward</h1>

        <div className="hm-fan" aria-hidden="true">
          {SEATS.map((seat, i) => (
            <AnimatePresence key={i} mode="wait" initial={false}>
              <motion.div
                key={FAN[side][i]}
                className="hm-fan-card"
                style={{ zIndex: seat.z } as CSSProperties}
                initial={reduce ? false : { opacity: 0, scale: 0.72, rotate: 0, x: 0, y: 34 }}
                animate={{ opacity: 1, scale: 1, rotate: seat.tilt, x: `${seat.x}%`, y: `${seat.y}%` }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.84, y: 18, transition: { duration: 0.2, ease: 'easeIn' } }}
                transition={{ ...spring, delay: reduce ? 0 : 0.1 + i * 0.07 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={base() + FAN[side][i]} alt="" draggable={false} />
              </motion.div>
            </AnimatePresence>
          ))}
        </div>

        <h2 className="hm-role">
          <span className={side === 'engineering' ? 'is-on' : ''}>Engineer</span>
          <span className="hm-role-and"> and </span>
          <span className={side === 'art' ? 'is-on' : ''}>Artist</span>
        </h2>

        {/* no labels: the underline in the line above says which side you are on */}
        <button
          type="button"
          className="hm-switch"
          role="switch"
          aria-checked={side === 'art'}
          aria-label={side === 'art' ? 'Showing art. Switch to engineering.' : 'Showing engineering. Switch to art.'}
          onClick={() => setSide((s) => (s === 'art' ? 'engineering' : 'art'))}
        >
          <span className="hm-switch-knob" aria-hidden="true" />
        </button>
      </header>

      {/* keyed on the side, so switching remounts and animates in; no exit to wait on,
          which means a stalled animation can never deadlock the swap */}
      <motion.section
        key={side}
        className="hm-work"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.01 : 0.32, ease: 'easeOut' }}
      >
        <h3 className="hm-work-title">Selected work</h3>
        <p className="hm-work-sub">
          {side === 'engineering' ? 'Simulators, solvers and the odd neural network' : 'Markers, leather paint and a lot of patience'}
        </p>
        {side === 'engineering' ? (
          <ul className="hm-grid">
            {ALL_PROJECTS.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onOpenProject(c)} aria-label={`Open ${c.title}`}>
                  <span className="hm-tile">
                    {c.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={base() + c.image} alt="" loading="lazy" draggable={false} />
                    )}
                  </span>
                  <span className="hm-tile-name">{c.title}</span>
                  <span className="hm-tile-line">{c.line}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="hm-grid hm-grid--art">
            {ALL_ART.map((a) => (
              <li key={a.image}>
                <button
                  type="button"
                  onClick={() => onOpenArt({ image: a.image, caption: a.caption, materials: a.materials })}
                  aria-label={`Open ${a.caption}`}
                >
                  <span className="hm-tile">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={base() + a.image} alt="" loading="lazy" draggable={false} />
                  </span>
                  <span className="hm-tile-name">{a.caption}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <footer className="hm-foot">
        <h3 className="hm-work-title">Contact</h3>
        <ul className="hm-contacts">
          {CONTACTS.map((c) => (
            <li key={c.id}>
              <a href={c.href} target={c.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {c.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#/about">About</a>
          </li>
        </ul>
      </footer>
    </div>
  );
}
