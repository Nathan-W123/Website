'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ABOUT, CONTACTS } from './content';
import { BrandIcon } from './icons';
import { TopBar } from './topbar';

/**
 * About: the whole thing set large, one sentence at a time. Only the line you
 * are reading is in ink — the rest sit back in grey and come forward as you
 * scroll onto them.
 */
/** How the little pile of marks sits before you reach for it. */
const LEAN = [-7, -2.5, 3, 7];

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
    pick();
    scroller?.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', pick);
    return () => {
      scroller?.removeEventListener('scroll', pick);
      window.removeEventListener('resize', pick);
    };
  }, []);

  return (
    <div className="hm ab2" ref={root}>
      <TopBar onHome={onHome} here="about" />
      <h1 className="ab2-title">
        <motion.span layoutId="nathan" className="hm-name-text">
          Nathan Ward
        </motion.span>
      </h1>
      <div className="ab2-body">
        {ABOUT.paragraphs.map((p, i) => (
          <p
            key={p}
            ref={(el) => {
              lines.current[i] = el;
            }}
            className={`ab2-line${i === active ? ' is-on' : ''}`}
          >
            {p}
          </p>
        ))}
      </div>
      <footer className="hm-foot">
        {/* a small pile of marks that fans out when you reach for it */}
        <div
          className="ab2-social"
          onMouseEnter={() => setFan(true)}
          onMouseLeave={() => setFan(false)}
          onFocusCapture={() => setFan(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFan(false);
          }}
        >
          {CONTACTS.map((c, i) => (
            <motion.a
              key={c.id}
              className="ab2-chip"
              href={c.href}
              target={c.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
              aria-label={c.label}
              style={{ zIndex: CONTACTS.length - i }}
              animate={open ? { x: `${(i - 1.5) * 118}%`, rotate: 0, scale: 1 } : { x: `${(i - 1.5) * 13}%`, rotate: LEAN[i], scale: 0.96 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30, delay: (fan ? i : CONTACTS.length - 1 - i) * 0.03 }}
              whileHover={reduce ? undefined : { y: -6 }}
            >
              <BrandIcon id={c.id} size={25} />
            </motion.a>
          ))}
        </div>
      </footer>
    </div>
  );
}
