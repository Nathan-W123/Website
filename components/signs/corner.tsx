'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * The mark pinned to the top-left corner, and the way round the site from it.
 * It wears whichever side you are on — a contour integral for the engineering
 * half, a brush for the art half — and it goes nowhere itself: it opens the
 * bubbles, which do the going. Hovering it (or tabbing to it) bursts them out
 * from behind it on a quarter arc into the page; on a touch screen, where
 * there is no hover, a tap opens them and a tap anywhere else closes them.
 *
 * The route shell renders this once, above the page swap, so moving between
 * pages never unmounts it.
 */

/** how far the bubbles' centres sit from the mark's centre, in px */
const REACH = 76;

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

export type Side = 'engineering' | 'art';
export type Bubble = { label: string; href?: string; onClick?: () => void };

export function Corner({ side, items }: { side: Side; items: Bubble[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setOpen(false);
    };
    // Esc closes the bubbles and goes no further: the shell would otherwise
    // read it as "go back" and leave the page
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  return (
    <nav ref={nav} className={`hm-corner-nav${open ? ' is-open' : ''}`} aria-label="Site">
      <button
        type="button"
        className="hm-corner"
        aria-expanded={open}
        aria-label={open ? 'Close the menu' : 'Open the menu'}
        onClick={() => setOpen((o) => !o)}
      >
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
      </button>
      <ul className="hm-corner-bubbles">
        {items.map((it, i) => {
          // spread across a quarter turn, from straight right to straight down
          const a = ((items.length === 1 ? 45 : (i * 90) / (items.length - 1)) * Math.PI) / 180;
          const at = { '--i': i, '--x': `${Math.round(Math.cos(a) * REACH)}px`, '--y': `${Math.round(Math.sin(a) * REACH)}px` } as CSSProperties;
          return (
            <li key={it.label} style={at}>
              {it.href ? (
                <a className="hm-bubble" href={it.href} onClick={() => setOpen(false)}>
                  {it.label}
                </a>
              ) : (
                <button
                  type="button"
                  className="hm-bubble"
                  onClick={() => {
                    setOpen(false);
                    it.onClick?.();
                  }}
                >
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
