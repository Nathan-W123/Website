'use client';

import { useEffect, type ReactNode } from 'react';
import { ABOUT, CONTACTS, EMAIL } from '@/components/signs/content';
import { BrandIcon } from '@/components/signs/icons';
import { Loop, Shell } from './chrome';
import { Peek, useWarmPeeks, type PeekSet } from './peek';

/**
 * Home: who Nathan is in his own words, in EB Garamond, on the left, and on
 * the right the morphing ribbon the About had before the redesign
 * (Downloads/Nathan - Morphing Ribbon.gif, its dark ground taken to white and
 * its lines to grey, work/ref/ribbon-recolour.mjs, multiplied onto the
 * paper), the way that About was laid out. The paper plane at the foot comes
 * with the shell, chrome.tsx. Three phrases in the About carry a picture chip
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

/** the phrases in the About followed by a picture chip */
const MARKS: { text: string; peek: keyof typeof PEEKS }[] = [
  { text: 'quantum research', peek: 'quantum' },
  { text: 'art business', peek: 'art' },
  { text: 'ACS exam', peek: 'ochem' },
];

const mark = (text: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let rest = text;
  for (;;) {
    const hits = MARKS.map((m) => [rest.indexOf(m.text), m] as const).filter(([i]) => i >= 0);
    if (!hits.length) break;
    const [i, m] = hits.reduce((a, b) => (b[0] < a[0] ? b : a));
    out.push(rest.slice(0, i + m.text.length));
    out.push(<Peek key={out.length} set={PEEKS[m.peek]} />);
    rest = rest.slice(i + m.text.length);
  }
  if (rest) out.push(rest);
  return out;
};

const ALL_PEEKS = Object.values(PEEKS);

export default function Home() {
  useWarmPeeks(ALL_PEEKS);
  // Links into the site this one replaces all come here, since it lived at /
  // with its pages after a #: the NFC tag opens nateward.me/#/contact, and
  // that (and #/about) is this page now, so the old part comes off the
  // address; old art and project links go on to the pages that have them.
  useEffect(() => {
    const route = /^#\/([a-z-]+)/.exec(window.location.hash)?.[1];
    if (!route) return;
    if (route === 'art') window.location.replace('/art/');
    else if (route === 'projects') window.location.replace('/projects/');
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);
  return (
    <Shell page="home">
      <section className="nw-col nw-home" aria-labelledby="nw-hi">
        <div className="nw-about">
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
        </div>
        <div className="nw-ribbon" aria-hidden="true">
          <Loop src="/about/ribbon" className="nw-ribbon-media" />
        </div>
      </section>
    </Shell>
  );
}
