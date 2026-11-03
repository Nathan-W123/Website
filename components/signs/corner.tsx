'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * The mark pinned to the top-left corner. It wears whichever side you are on —
 * a contour integral for the engineering half, a brush for the art half — and
 * it never changes sides itself: on the home page it opens About, and on About
 * it takes you back. Both pages render this so the mark stays put between them.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

export type Side = 'engineering' | 'art';

export function Corner({ side, href, onClick, label, say }: { side: Side; href?: string; onClick?: () => void; label: string; say: string }) {
  const reduce = useReducedMotion();
  const inside = (
    <>
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
      <span className="hm-corner-say" aria-hidden="true">
        {say}
      </span>
    </>
  );
  return href ? (
    <a className="hm-corner" href={href} aria-label={label}>
      {inside}
    </a>
  ) : (
    <button type="button" className="hm-corner" onClick={onClick} aria-label={label}>
      {inside}
    </button>
  );
}
