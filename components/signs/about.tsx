'use client';

import { useEffect, useRef, useState } from 'react';
import { ABOUT, CONTACTS, PROJECT_GROUPS, RECENT, type Card } from './content';
import { TopBar } from './topbar';

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

/**
 * About: the whole thing set large, one sentence at a time. Only the line you
 * are reading is in ink — the rest sit back in grey and come forward as you
 * scroll onto them.
 */
/** The bench, resolved against the project list so a tile carries its real title. */
type Feature = { key: string; title: string; status: string; image: string; card?: Card };
const ALL: Card[] = PROJECT_GROUPS.flatMap((g) => g.cards);
const FEATURED: Feature[] = RECENT.flatMap((r) => {
  if (r.kind === 'art') return [{ key: r.image, title: r.title, status: r.status, image: r.image }];
  const card = ALL.find((c) => c.id === r.id);
  return card ? [{ key: r.id, title: card.title, status: r.status, image: `/tiles/${r.id}.webp`, card }] : [];
});

export function About({
  onHome,
  onOpenProject,
  onOpenArt,
}: {
  onHome: () => void;
  onOpenProject: (c: Card) => void;
  onOpenArt: (v: { image: string; caption: string; materials?: string[] }) => void;
}) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLParagraphElement | null)[]>([]);

  // The line nearest the reading line is the one in ink. Picking a single
  // winner each frame, rather than asking each line whether it is on screen,
  // is what keeps exactly one of them dark at any time.
  useEffect(() => {
    // our own scrolling ancestor, not whichever .sg-page happens to be first:
    // during a route change the outgoing page is still in the document, and
    // listening to that one means the handler dies with it
    const scroller = root.current?.closest('.sg-page');
    const pick = () => {
      const reading = window.innerHeight * 0.42;
      let best = 0;
      let bestGap = Infinity;
      lines.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const gap = Math.abs(r.top + r.height / 2 - reading);
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      });
      setActive(best);
    };
    pick();
    scroller?.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', pick);
    return () => {
      scroller?.removeEventListener('scroll', pick);
      window.removeEventListener('resize', pick);
    };
  }, []);

  return (
    <div className="hm ab2" ref={root}>
      <TopBar onHome={onHome} here="about" />
      <h1 className="ab2-title">About</h1>
      <div className="ab2-body">
        {ABOUT.paragraphs.map((p, i) => (
          <p
            key={p}
            ref={(el) => {
              lines.current[i] = el;
            }}
            className={`ab2-line${i === active ? ' is-on' : ''}`}
          >
            {p}
          </p>
        ))}
      </div>
      <section className="ab2-featured">
        <h2 className="hm-work-title">Featured work</h2>
        <p className="hm-work-sub">What is on the bench right now</p>
        <ul className="hm-grid ab2-grid">
          {FEATURED.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                aria-label={`Open ${f.title}`}
                onClick={() =>
                  f.card
                    ? onOpenProject(f.card)
                    : onOpenArt({ image: f.image, caption: f.title, materials: undefined })
                }
              >
                <span className="hm-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={base() + f.image} alt="" loading="lazy" draggable={false} />
                </span>
                <span className="hm-tile-text">
                  <span className="hm-tile-name">{f.title}</span>
                  <span className="hm-tile-line">{f.status}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="hm-foot">
        <h2 className="hm-work-title">Contact</h2>
        <ul className="hm-contacts">
          {CONTACTS.map((c) => (
            <li key={c.id}>
              <a href={c.href} target={c.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
