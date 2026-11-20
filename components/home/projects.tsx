'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { ART, PROJECT_GROUPS, type Card } from '@/components/signs/content';
import { Shell } from './chrome';
import { Peek, type PeekSet } from './peek';
import { SHOT_SIZE } from './shot-sizes';

/**
 * Projects, laid out like Work: a line down the left with a dot at each
 * section (ML / AI, simulations, numerical modeling, civil), and under each,
 * one line per project. A project opens into its write-up (the one its old
 * project page had), with a picture chip in its first sentence that opens
 * into the project's own screenshots, the way the About's chips do.
 */
const SECTIONS: { label: string; ids: string[] }[] = [
  { label: 'ML / AI', ids: ['machina', 'siege', 'gambit'] },
  { label: 'Simulations', ids: ['aero', 'aether6', 'ignis', 'black-hole'] },
  { label: 'Numerical modeling', ids: ['sparlab', 'hf-scf', 'quantize', 'formulate'] },
  { label: 'Civil', ids: ['olson', 'high-risk-roads'] },
];
const BY_ID = new Map(PROJECT_GROUPS.flatMap((g) => g.cards).map((c) => [c.id, c]));

/** a card the size of about a postcard, in the picture's own shape */
const cardSize = (src: string) => {
  const s = SHOT_SIZE[src];
  const ar = s ? s[0] / s[1] : 4 / 3;
  const w = Math.sqrt(31000 * ar);
  const h = Math.sqrt(31000 / ar);
  const k = Math.min(1, 230 / w, 210 / h);
  return { w: Math.round(w * k), h: Math.round(h * k) };
};

const peekFor = (c: Card): PeekSet | null => {
  const shots = c.images.slice(0, 3);
  if (!shots.length) return null;
  return { label: c.title, icon: shots[0].src, cards: shots.map((s) => ({ src: s.src, alt: s.caption, ...cardSize(s.src) })) };
};

/** the chip goes at the end of the write-up's first sentence, before its full stop */
const withChip = (text: string, chip: ReactNode): ReactNode[] => {
  const m = /[.?!](?=\s|$)/.exec(text);
  if (!m) return [text, chip];
  return [text.slice(0, m.index), chip, text.slice(m.index)];
};

function Project({ c }: { c: Card }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);
  const id = useId();
  const body = c.study?.page.body ?? [c.line];
  const peek = useMemo(() => peekFor(c), [c]);
  // its pictures start loading as it opens, so the chip's fan has them
  useEffect(() => {
    if (open && peek) peek.cards.forEach((card) => { const i = new Image(); i.src = card.src; });
  }, [open, peek]);
  return (
    <li className={`nw-proj${open ? ' is-open' : ''}`}>
      <button type="button" className="nw-proj-row" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className="nw-proj-name">{c.title}</span>
        <span className="nw-proj-tag">{c.tag}</span>
        <span className="nw-proj-sign" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className={`nw-proj-body${settled ? ' is-settled' : ''}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            // clipped while it moves; once open, the chip's fan may reach out past the write-up
            onAnimationStart={() => setSettled(false)}
            onAnimationComplete={() => setSettled(open)}
            transition={{ duration: reduce ? 0.01 : 0.32, ease: [0.22, 1, 0.3, 1] }}
          >
            <div className="nw-proj-inner">
              {body.map((p, i) => (
                <p key={i}>{i === 0 && peek ? withChip(p, <Peek key="peek" set={peek} />) : p}</p>
              ))}
              {c.href && (
                <p className="nw-proj-link">
                  <a href={c.href} target="_blank" rel="noreferrer">
                    Code ↗
                  </a>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function Projects() {
  return (
    <Shell page="projects">
      <section className="nw-col nw-section" aria-labelledby="nw-projects">
        <h1 id="nw-projects">Projects</h1>
        <p className="nw-lede">Things I&apos;ve built. Open one to read more.</p>
        <ol className="nw-timeline">
          {SECTIONS.map((s) => (
            <li key={s.label}>
              <h2 className="nw-role">{s.label}</h2>
              <ul className="nw-projs">
                {s.ids
                  .map((id) => BY_ID.get(id))
                  .filter((c): c is Card => !!c)
                  .map((c) => (
                    <Project key={c.id} c={c} />
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}

/** Art: the drawings, shoes and doodles, each with its caption. */
export function Art() {
  return (
    <Shell page="art">
      <section className="nw-col nw-section" aria-labelledby="nw-art">
        <h1 id="nw-art">Art</h1>
        {ART.map((s) => (
          <Fragment key={s.id}>
            <h2>{s.label}</h2>
            <ul className="nw-art">
              {s.items.map((it) => (
                <li key={it.image}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image} alt={it.caption} loading="lazy" />
                  {it.caption && <span>{it.caption}</span>}
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </section>
    </Shell>
  );
}
