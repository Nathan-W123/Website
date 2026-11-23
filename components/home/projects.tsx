'use client';

import 'katex/dist/katex.min.css';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  // github.com/Nathan-W123/Ab-Initio-MD (its README has the numbers below);
  // its pictures are runs of the engine itself (work/ref/aimd-pictures.mjs)
  {
    id: 'ab-initio-md',
    title: 'Ab Initio MD',
    line: 'Quantum molecular dynamics engine',
    tag: 'Quantum molecular dynamics engine',
    stack: ['Python', 'NumPy', 'SciPy', 'Numba', 'PySCF'],
    href: 'https://github.com/Nathan-W123/Ab-Initio-MD',
    notes: [],
    images: [
      { src: '/projects/ab-initio-md/1.webp', caption: 'Methanol at one step of a 300 K run, with the force the engine computes on each atom (RHF/6-31G*)' },
      { src: '/projects/ab-initio-md/2.webp', caption: 'That run’s temperature: started at 30 K, brought to 300 K by the thermostat and held there' },
      { src: '/projects/ab-initio-md/3.webp', caption: 'Water’s shape as the engine computes it (HF/STO-3G): 0.9894 Å and 100.03°, against the published 0.989 Å and 100.0°' },
      { src: '/projects/ab-initio-md/4.webp', caption: 'Water left to move freely for a picosecond (HF/6-31G*): kinetic and potential energy trade back and forth, and the total stays within 0.07 kcal/mol' },
    ],
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
  // the orchard estimate is backend/chillwatch/estimate.py (k = 6; lapse shrink
  // 0.75 and dz scale 600 ft from config/thresholds.yaml, fitted on 2018-19 to
  // 2022-23, 2.333 F MAE leaving stations out on 2023-24 and 2024-25)
  terra: [
    'Going to one of the biggest ag schools in the nation, you realize there’s a lot more to farming than planting and harvesting, like data analysis. Fruit and nut trees, for one, need enough winter cold to bloom, and growers count it hour by hour.',
    'So we built Terra, a local-first assistant for orchard growers: their weather, their winter chill and the data behind them. It tracks each orchard’s chill through the winter and messages the grower, through the OpenAI and Twilio APIs, when chill is close to met, when something looks wrong, or when the season won’t reach it.',
    'The backend pulls CIMIS station observations and checks 17.3 million readings for nine kinds of fault, comparing each station’s temperatures with its neighbours’ and flagging suspect humidity, wind and solar readings. Then it estimates the temperature at the orchard itself from the six nearest stations:',
    '$$orchard-estimate$$',
    'Each station’s reading is carried to the orchard’s elevation by that hour’s lapse rate γ, the median slope of temperature against elevation between stations, and weighted by its distance d and its height difference Δz, with the 0.75 and the 600 ft fitted on five earlier seasons. Every hour between 32 and 45 °F from November through March counts toward the orchard’s chill.',
    'Tested by planting 50 faults in a held-out season, it caught 9 of 9 outages, 8 of 9 stuck sensors and 7 of 8 spikes at about half a false alarm per station-month. Predicting each station from the others over the two seasons that followed, the orchard estimate is off by 2.3 °F on average.',
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
 * Words in a write-up that open another project on this page: the words as
 * the write-up has them, and the project they open.
 */
const LINKS: Record<string, { text: string; to: string }[]> = {
  // Olson's structural analysis was run with SparLab's FEA engine
  olson: [{ text: 'SparLab’s FEA engine', to: 'sparlab' }],
};
/** what such a link sends: the project by that id opens and comes into view */
const OPEN_PROJECT = 'nw-open-project';

/**
 * The write-up as paragraphs of text, chips and links: each place's chip goes
 * right after its phrase, in the first paragraph that has it
 * (project-pictures.ts), and each link over its words (LINKS).
 */
const writeUp = (c: Card, body: string[]): ReactNode[][] => {
  const places = PLACES[c.id] ?? [];
  const links = LINKS[c.id] ?? [];
  const home = places.map((p) => body.findIndex((t) => t.includes(p.after)));
  if (process.env.NODE_ENV !== 'production') {
    places.forEach((p, i) => home[i] < 0 && console.warn(`${c.id}: no "${p.after}" in the write-up`));
    links.forEach((l) => body.some((t) => t.includes(l.text)) || console.warn(`${c.id}: no "${l.text}" in the write-up`));
  }
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
    // what is set into the text, in order: from..to is the stretch of text it takes
    const cuts: { from: number; to: number; node: ReactNode }[] = [];
    places.forEach((p, i) => {
      const set = home[i] === pi ? setFor(c, p.shots) : null;
      if (!set) return;
      const end = text.indexOf(p.after) + p.after.length;
      // punctuation right after a chip keeps to its line (a '?' once wrapped onto a line of its own)
      const tail = /^[.,;:?!)]*/.exec(text.slice(end))?.[0] ?? '';
      cuts.push({
        from: end,
        to: end + tail.length,
        node: (
          <span key={`pk${i}`} className="nw-glue">
            <Peek set={set} zoomable />
            {tail}
          </span>
        ),
      });
    });
    links.forEach((l, i) => {
      const at = text.indexOf(l.text);
      if (at < 0) return;
      cuts.push({
        from: at,
        to: at + l.text.length,
        node: (
          <a
            key={`ln${i}`}
            className="nw-xref"
            href={`#${l.to}`}
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent(OPEN_PROJECT, { detail: l.to }));
            }}
          >
            {l.text}
          </a>
        ),
      });
    });
    cuts.sort((a, b) => a.from - b.from);
    const out: ReactNode[] = [];
    let pos = 0;
    for (const k of cuts) {
      out.push(text.slice(pos, k.from), k.node);
      pos = k.to;
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
  // two clips from the old site's gallery (components/signs/gallery.ts), silent loops
  aero: {
    src: '/projects/aero/1',
    poster: '/projects/aero/1.webp',
    caption: 'An aircraft in the 3D tunnel: its wake replayed as a time-lapse while the camera orbits',
  },
  ignis: {
    src: '/projects/ignis/1',
    poster: '/projects/ignis/1.webp',
    caption: 'The RS-25’s plume, marched from rest and drawn as a GPU volume inside NASA’s model of the bell',
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
  // H + H2 -> H2 + H, run for this page by the engine itself (UHF/6-31G forces,
  // velocity Verlet at 0.25 fs) and drawn by work/ref/h3-render.mjs
  'ab-initio-md': {
    src: '/projects/ab-initio-md/reaction',
    poster: '/projects/ab-initio-md/reaction.webp',
    caption: 'H + H₂ → H₂ + H, run by the engine with Hartree–Fock forces at every step: a hydrogen atom (blue) flies into H₂, takes one of its atoms and sends the other away, and the total energy stays flat',
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
  olson: ['Autodesk Fusion', 'SparLab', 'ASCE 7-22', 'AISC 360-22', 'ACI 318-19', '2025 CBC'],
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
  const row = useRef<HTMLLIElement>(null);
  // asked to come into view: it does once it has finished opening, since a
  // scroll made while it grows is undone by the browser keeping the words
  // being read in place
  const [view, setView] = useState(0);
  const viewed = useRef(0);
  useEffect(() => {
    if (!settled || view === viewed.current) return;
    viewed.current = view;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }, [view, settled]);
  // opened by a link in another write-up (LINKS), or by its id after # in the address
  useEffect(() => {
    const show = () => {
      setOpen(true);
      setView((v) => v + 1);
    };
    if (window.location.hash === `#${c.id}`) show();
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail === c.id) show();
    };
    window.addEventListener(OPEN_PROJECT, onOpen);
    return () => window.removeEventListener(OPEN_PROJECT, onOpen);
  }, [c.id]);
  return (
    <li id={c.id} ref={row} className={`nw-proj${open ? ' is-open' : ''}`}>
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
              {stack.length > 0 && (
                // each name whole on its line ('AISC 360-22' was splitting at its hyphen)
                <p className="nw-proj-stack">
                  {stack.map((s, i) => (
                    <Fragment key={s}>
                      {i > 0 && ' · '}
                      <span>{s}</span>
                    </Fragment>
                  ))}
                </p>
              )}
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
    <Shell page="projects" banner="wave" sendoff>
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
