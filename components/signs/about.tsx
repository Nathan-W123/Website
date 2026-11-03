'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ABOUT, CONTACTS, SPOTS } from './content';
import { BrandIcon } from './icons';

/**
 * About: a few paragraphs at a size you can actually read. Some phrases carry
 * a picture set into them, and hovering one scatters a few more above the line.
 */

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

/** Where the pictures land when a phrase is opened. Deliberately uneven. */
const SCATTER = [
  { x: '-152%', y: '-118%', r: -12, s: 1 },
  { x: '-18%', y: '-168%', r: 6, s: 1.08 },
  { x: '134%', y: '-104%', r: 14, s: 0.94 },
];

/**
 * A phrase with a picture set into it. The pictures are absolutely placed and
 * never enter the flow, so the sentence does not reflow when they appear.
 */
function Spot({ name, text, reduce }: { name: string; text: string; reduce: boolean }) {
  const [open, setOpen] = useState(false);
  const spot = SPOTS[name];
  if (!spot) return <>{text}</>;
  return (
    <span
      className="ab2-spot"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {text}{' '}
      <button type="button" className="ab2-spot-mark" aria-label={`${text} — show photos`} onClick={() => setOpen((v) => !v)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={base() + spot.icon} alt="" draggable={false} />
        <span className="ab2-spot-fan" aria-hidden="true">
          {spot.shots.map((src, i) => (
            <motion.span
              key={src}
              className="ab2-spot-shot"
              initial={false}
              animate={
                open && !reduce
                  ? { opacity: 1, x: SCATTER[i].x, y: SCATTER[i].y, rotate: SCATTER[i].r, scale: SCATTER[i].s }
                  : { opacity: 0, x: '0%', y: '-20%', rotate: 0, scale: 0.7 }
              }
              transition={{ type: 'spring', stiffness: 340, damping: 28, delay: open ? i * 0.04 : 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={base() + src} alt="" loading="lazy" draggable={false} />
            </motion.span>
          ))}
        </span>
      </button>
    </span>
  );
}

/** Split a paragraph on the {key|words} marks and render the pieces. */
function line(text: string, reduce: boolean) {
  const out: ReactNode[] = [];
  const re = /\{([a-z-]+)\|([^}]+)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<Spot key={m.index} name={m[1]} text={m[2]} reduce={reduce} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function About({ onHome }: { onHome: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="hm ab2">
      <button type="button" className="pv-back ab2-back" onClick={onHome}>
        ← Back
      </button>

      <div className="ab2-body">
        {ABOUT.paragraphs.map((p) => (
          <p key={p} className="ab2-line">
            {line(p, !!reduce)}
          </p>
        ))}
        {/* always out, because a row you have to keep hovered is a row you
            cannot click */}
        <p className="ab2-line ab2-socials">
          Find me on
          {CONTACTS.map((c) => (
            <a
              key={c.id}
              className="ab2-chip"
              href={c.href}
              target={c.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
              aria-label={c.label}
            >
              <BrandIcon id={c.id} size={20} />
            </a>
          ))}
        </p>
      </div>
    </div>
  );
}
