'use client';

import type { ReactNode } from 'react';
import { ABOUT, CONTACTS, EMAIL } from '@/components/signs/content';
import { BrandIcon } from '@/components/signs/icons';
import { Shell } from './chrome';

/**
 * Home, after the reference Nathan picked: the study across the top, then who
 * he is in his own words, in Courier New, and nothing after it.
 */

/** The About, word for word from content.ts: its opening line is the heading. */
const [OPENING, ...REST_OF_FIRST] = ABOUT.paragraphs[0].split(/(?<=\.)\s+/);
const PARAGRAPHS = [REST_OF_FIRST.join(' '), ...ABOUT.paragraphs.slice(1)];
/** set in bold where they occur, the way the reference marks its names */
const MARKED = ['civil engineering and chemistry', 'UC Davis', 'art business', 'top 1%'];

const mark = (text: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let rest = text;
  for (;;) {
    const hits = MARKED.map((m) => [rest.indexOf(m), m] as const).filter(([i]) => i >= 0);
    if (!hits.length) break;
    const [i, m] = hits.reduce((a, b) => (b[0] < a[0] ? b : a));
    if (i > 0) out.push(rest.slice(0, i));
    out.push(<strong key={out.length}>{m}</strong>);
    rest = rest.slice(i + m.length);
  }
  if (rest) out.push(rest);
  return out;
};

export default function Home() {
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
    </Shell>
  );
}
