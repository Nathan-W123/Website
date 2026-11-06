'use client';

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

/**
 * The mark pinned to the top-left corner. It wears whichever side you are on —
 * a contour integral for the engineering half, a brush for the art half — and
 * it never changes sides itself: on the home page it opens About, and on About
 * it takes you back.
 *
 * The route shell renders this once, above the page swap, so going between the
 * two never unmounts it and it has nothing to jump from. `turn` changes with
 * the route, and the mark answers by winding into itself and back out.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

export type Side = 'engineering' | 'art';

export function Corner({ side, href, label, say, turn = 0 }: { side: Side; href: string; label: string; say: string; turn?: number | string }) {
  const reduce = useReducedMotion();
  const spin = useAnimationControls();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) return;
    // in on itself, then out again: a whole turn with the scale pinched at the
    // half, which reads as a spiral rather than a spin
    spin.start({
      rotate: [0, 180, 360],
      scale: [1, 0.38, 1],
      transition: { duration: 0.74, times: [0, 0.5, 1], ease: [0.55, 0, 0.3, 1] },
    });
  }, [turn, reduce, spin]);

  const inside = (
    <>
      <motion.span className="hm-corner-turn" animate={spin}>
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
      </motion.span>
      <span className="hm-corner-say" aria-hidden="true">
        {say}
      </span>
    </>
  );
  // always an anchor, never sometimes a button: swapping the element type
  // would remount the whole thing and undo the point of hoisting it
  return (
    <a className="hm-corner" href={href} aria-label={label}>
      {inside}
    </a>
  );
}
