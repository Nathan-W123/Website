'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A picture chip in a line of text that opens into a small fan of three
 * pictures, after the reference Nathan showed (a thumbnail after a phrase;
 * hover it, or tap it on a phone, and three photos fly out of it and settle
 * at angles over the words below). The fan is shifted sideways if it would
 * run off the screen, and comes down a size on a phone.
 */

export type PeekCard = { src: string; alt: string; w: number; h: number };
export type PeekSet = { label: string; icon: string; cards: [PeekCard, PeekCard, PeekCard] };

/** where the three settle around the chip: left, middle (in front), right */
const FAN = [
  { x: -172, y: 118, r: -7, z: 1 },
  { x: 4, y: 132, r: 3, z: 3 },
  { x: 182, y: 100, r: 8, z: 2 },
];

export function Peek({ set }: { set: PeekSet }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState({ shift: 0, k: 1 });
  const root = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // size and place the fan for the screen it opens on
  const place = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const k = window.innerWidth < 600 ? 0.66 : 1;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const extents = FAN.map((f, i) => {
      const c = set.cards[i];
      return [cx + (f.x - c.w / 2 - 10) * k, cx + (f.x + c.w / 2 + 10) * k];
    });
    const lo = Math.min(...extents.map((e) => e[0]));
    const hi = Math.max(...extents.map((e) => e[1]));
    let shift = 0;
    if (hi > window.innerWidth - 12) shift = window.innerWidth - 12 - hi;
    if (lo + shift < 12) shift = 12 - lo;
    setLayout({ shift, k });
  }, [set.cards]);

  const show = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    place();
    setOpen(true);
  }, [place]);
  const hide = useCallback((delay = 0) => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), delay);
  }, []);

  // a tap anywhere else, or Escape, puts the pictures away
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) hide();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', () => hide(), { once: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open, hide]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const spring = reduce ? { duration: 0.01 } : { type: 'spring' as const, stiffness: 420, damping: 30, mass: 0.8 };

  return (
    <span
      ref={root}
      className={`pk${open ? ' is-open' : ''}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hide(140)}
    >
      <button
        type="button"
        className="pk-chip"
        aria-label={`${set.label}: ${open ? 'hide' : 'show'} pictures`}
        aria-expanded={open}
        onClick={() => (open ? hide() : show())}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={set.icon} alt="" draggable={false} />
      </button>
      <AnimatePresence>
        {open &&
          set.cards.map((c, i) => {
            const f = FAN[i];
            return (
              <motion.span
                key={c.src}
                className="pk-card"
                style={{ width: c.w * layout.k, height: c.h * layout.k, marginLeft: (-c.w * layout.k) / 2, marginTop: (-c.h * layout.k) / 2, zIndex: 40 + f.z }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.18, rotate: 0 }}
                animate={{ opacity: 1, x: f.x * layout.k + layout.shift, y: f.y * layout.k, scale: 1, rotate: f.r }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.18, rotate: 0, transition: { duration: reduce ? 0.01 : 0.18, ease: 'easeIn' } }}
                transition={{ ...spring, delay: reduce ? 0 : i * 0.035 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt={c.alt} draggable={false} />
              </motion.span>
            );
          })}
      </AnimatePresence>
    </span>
  );
}

/** fetch every picture once the page is idle, so a fan opens with its pictures in it */
export function useWarmPeeks(sets: PeekSet[]) {
  useEffect(() => {
    const warm = () => sets.forEach((s) => s.cards.forEach((c) => { const i = new Image(); i.src = c.src; }));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm);
    else window.setTimeout(warm, 1200);
  }, [sets]);
}
