'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { PROJECT_GROUPS, type Card } from '@/components/signs/content';
import { Shell } from './chrome';
import { Peek, type PeekSet } from './peek';
import { PLACES } from './project-pictures';
import { SHOT_SIZE } from './shot-sizes';

/**
 * Projects, laid out like Work: a line down the left with a dot at each
 * section (ML / AI, simulations, numerical modeling, civil), and under each,
 * one line per project. A project opens into its write-up (the one its old
 * project page had), with picture chips where its pictures fit the words
 * (project-pictures.ts), the way the About's chips do; a picture in a fan
 * opens large when clicked.
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

/** the pictures one chip opens into */
const setFor = (c: Card, shots: number[]): PeekSet | null => {
  const picked = shots.map((i) => c.images[i]).filter((s): s is Card['images'][number] => !!s);
  if (!picked.length) return null;
  return { label: c.title, icon: picked[0].src, cards: picked.map((s) => ({ src: s.src, alt: s.caption, ...cardSize(s.src) })) };
};

/**
 * The write-up as paragraphs of text and chips: each place's chip goes right
 * after its phrase, in the first paragraph that has it (project-pictures.ts).
 */
const writeUp = (c: Card, body: string[]): ReactNode[][] => {
  const places = PLACES[c.id] ?? [];
  const home = places.map((p) => body.findIndex((t) => t.includes(p.after)));
  if (process.env.NODE_ENV !== 'production')
    places.forEach((p, i) => home[i] < 0 && console.warn(`${c.id}: no "${p.after}" in the write-up`));
  return body.map((text, pi) => {
    const hits = places
      .map((p, i) => ({ p, i, at: home[i] === pi ? text.indexOf(p.after) : -1 }))
      .filter((h) => h.at >= 0)
      .sort((a, b) => a.at - b.at);
    const out: ReactNode[] = [];
    let pos = 0;
    for (const { p, i, at } of hits) {
      const end = at + p.after.length;
      out.push(text.slice(pos, end));
      const set = setFor(c, p.shots);
      if (set) out.push(<Peek key={`pk${i}`} set={set} zoomable />);
      pos = end;
    }
    out.push(text.slice(pos));
    return out;
  });
};

function Project({ c }: { c: Card }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);
  const id = useId();
  const body = useMemo(() => writeUp(c, c.study?.page.body ?? [c.line]), [c]);
  // its pictures start loading as it opens, so every chip's fan has them
  useEffect(() => {
    if (open) c.images.forEach((s) => { const i = new Image(); i.src = s.src; });
  }, [open, c]);
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
              {body.map((nodes, i) => (
                <p key={i}>{nodes}</p>
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
        <p className="nw-lede">Things I&apos;ve built and am passionate about.</p>
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
