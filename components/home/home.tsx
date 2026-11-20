'use client';

import type { ReactNode } from 'react';
import { ABOUT, CONTACTS, EMAIL } from '@/components/signs/content';
import { BrandIcon } from '@/components/signs/icons';
import { SendOff } from '@/components/signs/sendoff';
import { Shell } from './chrome';
import { Peek, useWarmPeeks, type PeekSet } from './peek';

/**
 * Home, after the reference Nathan picked: the study at the top, then who he
 * is in his own words, in Courier New, and the paper plane from the deployed
 * home to close the page. Three phrases in the About carry a picture chip
 * that opens into a fan of three (peek.tsx).
 */

/** The About, word for word from content.ts: its opening line is the heading. */
const [OPENING, ...REST_OF_FIRST] = ABOUT.paragraphs[0].split(/(?<=\.)\s+/);
const PARAGRAPHS = [REST_OF_FIRST.join(' '), ...ABOUT.paragraphs.slice(1)];

/**
 * The pictures behind the chips, at their size on screen (the files are twice
 * that). Quantum: "Hydrogen Density Plots" by
 * PoorLeno (three of its panels); organic chemistry: Ben Mills' ball-and-stick renders; both public
 * domain, from Wikimedia Commons (work/ref/peek-images.mjs). Art: Nathan's own.
 */
const PEEKS: Record<'quantum' | 'art' | 'ochem', PeekSet> = {
  quantum: {
    label: 'Quantum',
    icon: '/about/peek/quantum-icon.webp',
    cards: [
      { src: '/about/peek/quantum-1.webp', alt: 'The probability density of a hydrogen 4s orbital: rings around the nucleus', w: 156, h: 156 },
      { src: '/about/peek/quantum-2.webp', alt: 'A hydrogen orbital with n = 4, l = 3, m = 1: six lobes', w: 172, h: 172 },
      { src: '/about/peek/quantum-3.webp', alt: 'A hydrogen orbital with n = 4, l = 2, m = 0', w: 160, h: 160 },
    ],
  },
  art: {
    label: 'Art',
    icon: '/about/peek/art-icon.webp',
    cards: [
      { src: '/about/peek/art-1.webp', alt: 'Carnage, a marker drawing', w: 150, h: 176 },
      { src: '/about/peek/art-2.webp', alt: 'Hand-painted Gengar shoes', w: 168, h: 174 },
      { src: '/about/peek/art-3.webp', alt: 'Hand-painted graffiti shoes', w: 210, h: 157 },
    ],
  },
  ochem: {
    label: 'Organic chemistry',
    icon: '/about/peek/ochem-icon.webp',
    cards: [
      { src: '/about/peek/ochem-1.webp', alt: 'Caffeine, a ball-and-stick model', w: 164, h: 141 },
      { src: '/about/peek/ochem-2.webp', alt: 'Aspirin, a ball-and-stick model', w: 176, h: 169 },
      { src: '/about/peek/ochem-3.webp', alt: 'Paracetamol, a ball-and-stick model', w: 214, h: 134 },
    ],
  },
};

/** phrases marked in the About: set in bold, the way the reference marks its names, and/or followed by a chip */
const MARKS: { text: string; bold?: boolean; peek?: keyof typeof PEEKS }[] = [
  { text: 'civil engineering and chemistry', bold: true },
  { text: 'UC Davis', bold: true },
  { text: 'quantum research', peek: 'quantum' },
  { text: 'art business', bold: true, peek: 'art' },
  { text: 'top 1%', bold: true },
  { text: 'ACS exam', peek: 'ochem' },
];

const mark = (text: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let rest = text;
  for (;;) {
    const hits = MARKS.map((m) => [rest.indexOf(m.text), m] as const).filter(([i]) => i >= 0);
    if (!hits.length) break;
    const [i, m] = hits.reduce((a, b) => (b[0] < a[0] ? b : a));
    if (i > 0) out.push(rest.slice(0, i));
    out.push(m.bold ? <strong key={out.length}>{m.text}</strong> : m.text);
    if (m.peek) out.push(<Peek key={out.length} set={PEEKS[m.peek]} />);
    rest = rest.slice(i + m.text.length);
  }
  if (rest) out.push(rest);
  return out;
};

const ALL_PEEKS = Object.values(PEEKS);

export default function Home() {
  useWarmPeeks(ALL_PEEKS);
  return (
    <Shell page="home">
      <section className="nw-col nw-about" aria-labelledby="nw-hi">
        <h1 id="nw-hi">{OPENING}</h1>
        {PARAGRAPHS.map((p) => (
          <p key={p}>{mark(p)}</p>
        ))}
        <p className="nw-find" id="contact">
          Find me on
          {[...CONTACTS, EMAIL].map((c) => (
            <a
              key={c.id}
              href={c.href}
              target={c.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
              aria-label={c.label}
            >
              <BrandIcon id={c.id} size={21} />
            </a>
          ))}
        </p>
      </section>
      {/* the paper plane from the deployed home, last on the page */}
      <SendOff />
    </Shell>
  );
}
