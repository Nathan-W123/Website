'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';

/**
 * The mark pinned to the top-left corner, and the way round the site from it.
 * It wears whichever side you are on — a contour integral for the engineering
 * half, a brush for the art half — and it never changes sides itself: on the
 * home page it opens About, and on About it takes you back.
 *
 * Hovering it (or tabbing to it) bursts a few round bubbles out from behind it,
 * fanned on a quarter arc into the page: the other places worth going. The
 * route shell renders this once, above the page swap, so moving between pages
 * never unmounts it.
 */

/** how far the bubbles' centres sit from the mark's centre, in px */
const REACH = 76;

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

export type Side = 'engineering' | 'art';
export type Bubble = { label: string; href?: string; onClick?: () => void };

export function Corner({ side, href, label, items }: { side: Side; href: string; label: string; items: Bubble[] }) {
  const reduce = useReducedMotion();
  return (
    <nav className="hm-corner-nav" aria-label="Site">
      {/* always an anchor, never sometimes a button: swapping the element type
          would remount it on every page change */}
      <a className="hm-corner" href={href} aria-label={label}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={side}
            className="hm-corner-mark"
            initial={reduce ? false : { opacity: 0, rotate: -35, scale: 0.7 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 35, scale: 0.7, transition: { duration: 0.16 } }}
            transition={{ duration: reduce ? 0.01 : 0.26, ease: [0.22, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            {side === 'engineering' ? (
              <span className="hm-corner-int">&#8750;</span>
            ) : (
              <span
                className="hm-corner-brush"
                style={{ WebkitMaskImage: `url(${base()}/icons/brush.png)`, maskImage: `url(${base()}/icons/brush.png)` }}
              />
            )}
          </motion.span>
        </AnimatePresence>
      </a>
      <ul className="hm-corner-bubbles">
        {items.map((it, i) => {
          // spread across a quarter turn, from straight right to straight down
          const a = ((items.length === 1 ? 45 : (i * 90) / (items.length - 1)) * Math.PI) / 180;
          const at = { '--i': i, '--x': `${Math.round(Math.cos(a) * REACH)}px`, '--y': `${Math.round(Math.sin(a) * REACH)}px` } as CSSProperties;
          return (
          <li key={it.label} style={at}>
            {it.href ? (
              <a className="hm-bubble" href={it.href}>
                {it.label}
              </a>
            ) : (
              <button type="button" className="hm-bubble" onClick={it.onClick}>
                {it.label}
              </button>
            )}
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
