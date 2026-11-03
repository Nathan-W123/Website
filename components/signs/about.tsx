'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ABOUT, CONTACTS } from './content';
import { BrandIcon } from './icons';

/**
 * About: the whole thing set large, one sentence at a time. Only the line you
 * are reading is in ink — the rest sit back in grey and come forward as you
 * scroll onto them.
 */
/**
 * Closed, the pile reads as two cards: the front one square on, and one corner
 * behind it. The third and fourth sit exactly under the second, so the edge
 * stays a single clean line rather than a stack of four.
 */
const restAt = (n: number) => ({
  x: `${Math.min(n, 1) * 17}%`,
  y: `${Math.min(n, 1) * -5}%`,
  rotate: n === 0 ? 0 : 5,
  scale: n === 0 ? 1 : 0.97,
});

export function About({ onHome }: { onHome: () => void }) {
  const [active, setActive] = useState(0);
  const [fan, setFan] = useState(false);
  // a pile you cannot hover is a pile you cannot open, so on touch it starts fanned
  const [canHover, setCanHover] = useState(true);
  const reduce = useReducedMotion();
  const open = fan || !canHover || !!reduce;
  const root = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    const m = window.matchMedia('(hover: hover) and (pointer: fine)');
    const read = () => setCanHover(m.matches);
    read();
    m.addEventListener('change', read);
    return () => m.removeEventListener('change', read);
  }, []);

  // The line nearest the reading line is the one in ink. Picking a single
  // winner each frame, rather than asking each line whether it is on screen,
  // is what keeps exactly one of them dark at any time.
  useEffect(() => {
    // our own scrolling ancestor, not whichever .sg-page happens to be first:
    // during a route change the outgoing page is still in the document, and
    // listening to that one means the handler dies with it
    const scroller = root.current?.closest('.sg-page');
    const pick = () => {
      const reading = window.innerHeight * 0.42;
      let best = 0;
      let bestGap = Infinity;
      lines.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const gap = Math.abs(r.top + r.height / 2 - reading);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      });
      setActive(best);
    };
    // Measure again once the type has settled. The first pass runs while the
    // lines are still animating in and before the face has loaded, so the line
    // positions it reads are not the ones you end up looking at — which is why
    // the top of the page sat with nothing in ink until you scrolled.
    pick();
    const again = [window.setTimeout(pick, 120), window.setTimeout(pick, 850)];
    document.fonts?.ready.then(pick).catch(() => {});
    scroller?.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', pick);
    return () => {
      again.forEach((t) => window.clearTimeout(t));
      scroller?.removeEventListener('scroll', pick);
      window.removeEventListener('resize', pick);
    };
  }, []);

  return (
    <div className="hm ab2" ref={root}>
      {/* the name brought you here and it takes you back */}
      <h1 className="ab2-title">
        <button type="button" className="hm-name-link" onClick={onHome}>
          <motion.span layoutId="nathan" className="hm-name-text">
            Nathan Ward
          </motion.span>
          <span className="hm-name-hint" aria-hidden="true">
            Back home
          </span>
        </button>
      </h1>
      <div className="ab2-body">
        {ABOUT.paragraphs.map((p, i) => (
          <motion.p
            key={p}
            ref={(el) => {
              lines.current[i] = el;
            }}
            className={`ab2-line${i === active ? ' is-on' : ''}`}
            initial={reduce ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.3, 1], delay: reduce ? 0 : 0.16 + i * 0.07 }}
          >
            {p}
            {/* the marks sit at the end of the last line, not in a footer under it */}
            {i === ABOUT.paragraphs.length - 1 && (
            <div
              className="ab2-social"
              onMouseEnter={() => setFan(true)}
              onMouseLeave={() => setFan(false)}
              onFocusCapture={() => setFan(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFan(false);
              }}
            >
              {CONTACTS.map((c, n) => (
                <motion.a
                  key={c.id}
                  className="ab2-chip"
                  href={c.href}
                  target={c.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noreferrer"
                  aria-label={c.label}
                  style={{ zIndex: CONTACTS.length - n }}
                  animate={open ? { x: `${n * 112}%`, y: '0%', rotate: 0, scale: 1 } : restAt(n)}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30, delay: (fan ? n : CONTACTS.length - 1 - n) * 0.03 }}
                  whileHover={reduce ? undefined : { y: -5 }}
                >
                  <BrandIcon id={c.id} size={25} />
                </motion.a>
              ))}
            </div>
            )}
          </motion.p>
        ))}
      </div>
    </div>
  );
}
