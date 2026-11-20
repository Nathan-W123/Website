'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A picture chip in a line of text that opens into a small fan of three
 * pictures, after the reference Nathan showed (a thumbnail after a phrase;
 * hover it, or tap it on a phone, and three photos fly out of it and settle
 * at angles over the words below). The fan is shifted sideways if it would
 * run off the screen, and comes down a size on a phone. With , the
 * fan stays open while the pointer crosses to it, and a picture opens large
 * over the page when clicked.
 */

export type PeekCard = { src: string; alt: string; w: number; h: number };
/** one to three cards: a project with fewer pictures opens into fewer */
/** `back`: the picture behind the chip, if not the set's last */
export type PeekSet = { label: string; icon: string; cards: PeekCard[]; back?: string };

/** where the cards settle around the chip, by how many there are: for three,
 *  left, middle (in front), right */
const FANS = {
  1: [{ x: 0, y: 124, r: 3, z: 1 }],
  2: [
    { x: -98, y: 116, r: -6, z: 1 },
    { x: 104, y: 108, r: 7, z: 2 },
  ],
  3: [
    { x: -172, y: 118, r: -7, z: 1 },
    { x: 4, y: 132, r: 3, z: 3 },
    { x: 182, y: 100, r: 8, z: 2 },
  ],
};

export function Peek({ set, zoomable = false }: { set: PeekSet; zoomable?: boolean }) {
  const FAN = FANS[Math.min(3, Math.max(1, set.cards.length)) as 1 | 2 | 3];
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState({ shift: 0, k: 1 });
  const [zoom, setZoom] = useState<PeekCard | null>(null);
  // the picture behind the chip: the set's last, skipping the chip's own
  const backSrc = set.back ?? [...set.cards].reverse().find((c) => c.src !== set.icon)?.src ?? null;
  const root = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // size and place the fan for the screen it opens on
  const place = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    // smaller on a phone, and smaller still if even then the fan is wider than the screen
    const span = Math.max(...FAN.map((f, i) => f.x + (set.cards[i] ?? set.cards[0]).w / 2 + 10)) - Math.min(...FAN.map((f, i) => f.x - (set.cards[i] ?? set.cards[0]).w / 2 - 10));
    const k = Math.min(window.innerWidth < 600 ? 0.66 : 1, (window.innerWidth - 24) / span);
    const extents = FAN.map((f, i) => {
      const c = set.cards[i] ?? set.cards[0];
      return [cx + (f.x - c.w / 2 - 10) * k, cx + (f.x + c.w / 2 + 10) * k];
    });
    const lo = Math.min(...extents.map((e) => e[0]));
    const hi = Math.max(...extents.map((e) => e[1]));
    let shift = 0;
    if (hi > window.innerWidth - 12) shift = window.innerWidth - 12 - hi;
    if (lo + shift < 12) shift = 12 - lo;
    setLayout({ shift, k });
  }, [set.cards, FAN]);

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
      // a fan you can click into gets long enough to cross the gap to it
      onPointerLeave={(e) => e.pointerType === 'mouse' && hide(zoomable ? 380 : 140)}
    >
      {/* another picture of the set tucked behind the chip, so it reads as a
          small stack of the real pictures and says there is more in there.
          The last one, which is never the chip's own picture: the second was,
          on the About's art chip, and on some project chips a near twin */}
      {backSrc && (
        <span className="pk-back" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backSrc} alt="" draggable={false} />
        </span>
      )}
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
          set.cards.slice(0, 3).map((c, i) => {
            const f = FAN[i];
            return (
              <motion.span
                key={c.src}
                className={zoomable ? 'pk-card is-zoomable' : 'pk-card'}
                style={{ width: c.w * layout.k, height: c.h * layout.k, marginLeft: (-c.w * layout.k) / 2, marginTop: (-c.h * layout.k) / 2, zIndex: 40 + f.z }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.18, rotate: 0 }}
                animate={{ opacity: 1, x: f.x * layout.k + layout.shift, y: f.y * layout.k, scale: 1, rotate: f.r }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.18, rotate: 0, transition: { duration: reduce ? 0.01 : 0.18, ease: 'easeIn' } }}
                transition={{ ...spring, delay: reduce ? 0 : i * 0.035 }}
                whileHover={zoomable && !reduce ? { scale: 1.06, zIndex: 60 } : undefined}
              >
                {zoomable ? (
                  <button type="button" className="pk-card-open" aria-label={'Open: ' + c.alt} onClick={() => setZoom(c)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.src} alt="" draggable={false} />
                  </button>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.src} alt={c.alt} draggable={false} />
                )}
              </motion.span>
            );
          })}
      </AnimatePresence>
      {typeof document !== 'undefined' &&
        createPortal(<AnimatePresence>{zoom && <Zoom key={zoom.src} src={zoom.src} caption={zoom.alt} onClose={() => setZoom(null)} />}</AnimatePresence>, document.body)}
    </span>
  );
}

/** one picture, as large as the screen allows, over a dimmed page, with its caption and an optional second line; a click anywhere, the cross or Escape closes it */
export function Zoom({ src, caption, note, onClose }: { src: string; caption: string; note?: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      back?.focus?.({ preventScroll: true });
    };
  }, [onClose]);
  return (
    <motion.div
      className="pk-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={caption}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduce ? 0.01 : 0.16 } }}
      transition={{ duration: reduce ? 0.01 : 0.2 }}
      onClick={onClose}
    >
      <motion.figure
        initial={{ opacity: 0, scale: reduce ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.01 : 0.26, ease: [0.22, 1, 0.3, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption} draggable={false} />
        {(caption || note) && (
          <figcaption>
            {caption}
            {note && <span className="pk-zoom-note">{note}</span>}
          </figcaption>
        )}
      </motion.figure>
      <button ref={close} type="button" className="pk-zoom-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
    </motion.div>
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
