'use client';

import 'katex/dist/katex.min.css';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PROJECT_GROUPS, type Card } from '@/components/signs/content';
import { Shell } from './chrome';
import { Peek, Zoom, type PeekSet } from './peek';
import { EQUATIONS } from './equations';
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
  { label: 'Numerical modeling', ids: ['sparlab', 'hf-scf', 'quantize', 'formulate'] },
  { label: 'Simulations', ids: ['aero', 'aether6', 'ignis', 'black-hole', 'ab-initio-md'] },
  { label: 'Civil', ids: ['olson'] },
  { label: 'Data', ids: ['terra', 'high-risk-roads'] },
  { label: 'ML / AI', ids: ['machina', 'siege', 'gambit'] },
];
/**
 * Projects that live only here, not in the old site's notebook: Terra, which
 * Nathan co-built and wrote the whole backend of. Its write-up is from his
 * resume and the repo's README; its pictures are the repo's own screenshots
 * (docs/terra in github.com/EthanVTruong/terra) and its mascot.
 */
const EXTRA: Card[] = [
  // github.com/Nathan-W123/Ab-Initio-MD (its README has the numbers below)
  {
    id: 'ab-initio-md',
    title: 'Ab Initio MD',
    line: 'Quantum molecular dynamics engine',
    tag: 'Quantum molecular dynamics engine',
    stack: ['Python', 'NumPy', 'SciPy', 'Numba', 'PySCF'],
    href: 'https://github.com/Nathan-W123/Ab-Initio-MD',
    notes: [],
    images: [],
  },
  {
    id: 'terra',
    title: 'Terra',
    line: 'Chill hours monitor',
    tag: 'Chill hours monitor',
    stack: ['Python', 'PostgreSQL', 'OpenAI API', 'Twilio'],
    href: 'https://github.com/EthanVTruong/terra',
    notes: [],
    images: [
      { src: '/projects/terra/1.webp', caption: 'Terra beside its evidence: how many stations it could use for the orchard' },
      { src: '/projects/terra/2.webp', caption: "A grower's chat with Terra, with the orchard's temperature panel beside it" },
      { src: '/projects/terra/3.webp', caption: "Terra's mascot" },
      { src: '/projects/terra/4.webp', caption: 'Station lab on raw readings: the CIMIS stations around a demo orchard' },
      { src: '/projects/terra/5.webp', caption: "The same hour after Terra's checks" },
      { src: '/projects/terra/6.webp', caption: 'Pushing the Davis station to 125° by hand: Terra flags it' },
      { src: '/projects/terra/7.webp', caption: "Station lab: each station's reading, what was expected, and which ones report" },
      { src: '/projects/terra/8.webp', caption: 'Asking which station is acting up: the answer comes with its evidence' },
      { src: '/projects/terra/9.webp', caption: 'Turning on heads-ups, with the evidence behind the estimate' },
      { src: '/projects/terra/10.webp', caption: 'Orchard weather support: which stations were used and which were left out' },
    ],
  },
];
/** write-ups for the projects above, which have no study of their own */
const BODIES: Record<string, string[]> = {
  'ab-initio-md': [
    "How are chemical reactions discovered without the danger of mixing two volatile chemicals?",
    "Molecular dynamics simulates the interaction instead, and ab initio MD does it from quantum mechanics alone: at every time step it solves the electrons' Schrödinger equation for where the nuclei are, takes the forces from that energy, and moves the nuclei by Newton's laws:",
    '$$bomd$$',
    "It runs on its own Hartree–Fock engine, which computes the forces exactly rather than estimating them, and it can hold the molecules at a set temperature or let them move freely.",
    "Its energies and forces match PySCF, the standard quantum chemistry package, to 13 decimal places, water's computed shape matches published values, and left to move freely for a picosecond, its energy does not drift.",
  ],
  terra: [
    "Terra is a local-first assistant for orchard growers: their weather, their winter chill and the data behind them. It tracks each orchard's chill through the winter and messages the grower, through the OpenAI and Twilio APIs, when chill is close to met, when something looks wrong, or when the season won't reach it.",
    "The backend pulls CIMIS station observations and checks 17.3 million readings for nine kinds of fault, comparing each station's temperatures with its neighbours' and flagging suspect humidity, wind and solar readings, before estimating the temperature at the orchard itself.",
    'Tested by planting 50 faults in a held-out season, it caught 9 of 9 outages, 8 of 9 stuck sensors and 7 of 8 spikes at about half a false alarm per station-month.',
  ],
};
const BY_ID = new Map([...PROJECT_GROUPS.flatMap((g) => g.cards), ...EXTRA].map((c) => [c.id, c]));

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
  // the chip is a detail of the first picture, not all of it shrunk to a word's size (work/ref/chip-crops.mjs)
  return { label: c.title, icon: picked[0].src.replace(/\/(\d+)\.webp$/, '/chip-$1.webp'), cards: picked.map((s) => ({ src: s.src, alt: s.caption, ...cardSize(s.src) })) };
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
    // a paragraph that is only "$$name$$" is that equation, typeset ahead of time (equations.ts)
    const eq = /^\$\$([a-z-]+)\$\$$/.exec(text)?.[1];
    if (eq && EQUATIONS[eq])
      return [
        <span
          key="eq"
          className="nw-equation"
          // its width in ems, so the CSS can size it to fit the column
          style={{ '--eq-em': EQUATIONS[eq].em } as CSSProperties}
          dangerouslySetInnerHTML={{ __html: EQUATIONS[eq].html }}
        />,
      ];
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

/** a video a write-up can play, from a button beside its code link: the path
 *  without its ending (a .webm and an .mp4), its poster, and what it shows */
const VIDEOS: Record<string, { src?: string; poster?: string; embed?: string; caption: string; sound?: boolean }> = {
  // the videos Nathan made for LinkedIn (work/ref/project-videos.mjs)
  aether6: {
    // a new name, not flight: browsers kept the old clip cached under that one
    src: '/projects/aether6/circuit',
    poster: '/projects/aether6/circuit.webp',
    caption: 'The autonomous circuit: the autopilot flying the waypoints lap after lap on its own estimate',
  },
  // Terra's video, as its landing page (terra-orchard-landing.vercel.app) embeds it
  terra: {
    embed: 'https://www.youtube-nocookie.com/embed/awrDA6VIbRQ?autoplay=1&rel=0',
    caption: 'Terra, from its landing page',
  },
  // the narrated explainer from his application (work/ref/quantize-video.mjs):
  // it has sound, so it plays once, unmuted, rather than as a silent loop
  quantize: {
    src: '/projects/quantize/video',
    poster: '/projects/quantize/video.webp',
    caption: 'Quantize, explained: recovering a molecule’s shape from how it spins, with theory deciding where the data are blind',
    sound: true,
  },
  sparlab: {
    src: '/projects/sparlab/tower',
    poster: '/projects/sparlab/tower.webp',
    caption: 'An algorithm designs a tower: under a 1 kN load and 100 N·m of torsion, 176 iterations move the material to where the strain energy is highest, and a truss is left',
  },
};

/** what each project is built with, shown under its write-up: the languages,
 *  libraries and tools from its study's notes (the card's own list where
 *  there is none here) */
const STACKS: Record<string, string[]> = {
  machina: ['C++17', 'Eigen', 'Python', 'PyTorch', 'scikit-learn'],
  siege: ['Python', 'PyTorch', 'NumPy', 'Gymnasium', 'WebGL2'],
  gambit: ['Python', 'PyTorch', 'python-chess', 'ONNX Runtime', 'Lichess Bot API'],
  aero: ['Python', 'NumPy', 'Numba', 'WebGL2'],
  aether6: ['C++17', 'Eigen', 'yaml-cpp', 'Catch2', 'CMake'],
  ignis: ['C++17', 'Eigen', 'yaml-cpp', 'Catch2', 'CMake', 'PySide6', 'OpenGL'],
  'black-hole': ['Python', 'NumPy', 'SciPy', 'Matplotlib', 'pytest'],
  sparlab: ['C++17', 'Eigen', 'OpenMP', 'CMake', 'Catch2'],
  'hf-scf': ['Python', 'NumPy', 'Numba', 'FastAPI', 'React', '3Dmol.js'],
  'ab-initio-md': ['Python', 'NumPy', 'SciPy', 'Numba', 'PySCF'],
  quantize: ['Python', 'NumPy', 'SciPy', 'PySCF'],
  formulate: ['Python', 'RDKit', 'scikit-learn', 'thermo'],
  'high-risk-roads': ['R', 'tidyverse', 'sf', 'Leaflet', 'ggplot2'],
  olson: ['Autodesk Fusion', 'ASCE 7-22', 'AISC 360-22', 'ACI 318-19', '2025 CBC'],
};

/** who a project was built with, on a line of its own at the end of its write-up */
const BUILT_WITH: Record<string, { name: string; href: string }> = {
  terra: { name: 'Ethan Truong', href: 'https://www.ethantruong.me/' },
};

/** what a write-up's own link is called, where it is not code */
const LINK_LABELS: Record<string, string> = { olson: 'CAD' };
/** more links under a write-up, beside its own (a report, say) */
const MORE_LINKS: Record<string, { label: string; href: string }[]> = {
  // the preliminary calculations from the UWP 102E team report (5 Nov 2026),
  // which the write-up's numbers come from
  olson: [{ label: 'Structural analysis report', href: '/docs/olson-structural-analysis.pdf' }],
};

function Project({ c }: { c: Card }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const video = VIDEOS[c.id];
  const stack = STACKS[c.id] ?? c.stack;
  const more = MORE_LINKS[c.id] ?? [];
  const partner = BUILT_WITH[c.id];
  const id = useId();
  const body = useMemo(() => writeUp(c, BODIES[c.id] ?? c.study?.page.body ?? [c.line]), [c]);
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
              {partner && (
                <p className="nw-proj-credit">
                  Built with{' '}
                  <a href={partner.href} target="_blank" rel="noreferrer">
                    {partner.name}
                  </a>
                </p>
              )}
              {stack.length > 0 && <p className="nw-proj-stack">{stack.join(' · ')}</p>}
              {(c.href || video || more.length > 0) && (
                <p className="nw-proj-link">
                  {c.href && (
                    <a href={c.href} target="_blank" rel="noreferrer">
                      {LINK_LABELS[c.id] ?? 'Code'} ↗
                    </a>
                  )}
                  {more.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                      {l.label} ↗
                    </a>
                  ))}
                  {video && (
                    <button type="button" className="nw-proj-video" onClick={() => setPlaying(true)}>
                      Video ▶
                    </button>
                  )}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {video &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {playing && <Zoom key="video" src={video.poster ?? ''} video={video.src} embed={video.embed} sound={video.sound} caption={video.caption} onClose={() => setPlaying(false)} />}
          </AnimatePresence>,
          document.body,
        )}
    </li>
  );
}

export function Projects() {
  return (
    <Shell page="projects" banner="wave">
      <section className="nw-col nw-section" aria-labelledby="nw-projects">
        <h1 id="nw-projects">Projects</h1>
        <p className="nw-lede">Things I&apos;ve built and am passionate about.</p>
        <ul className="nw-groups">
          {SECTIONS.map((s) => (
            <li key={s.label} className="nw-group">
              <h2 className="nw-group-name">{s.label}</h2>
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
        </ul>
      </section>
    </Shell>
  );
}
