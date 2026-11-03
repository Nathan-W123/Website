'use client';

import { useEffect, useRef, useState } from 'react';
import { ABOUT, CONTACTS } from './content';
import { TopBar } from './topbar';

/**
 * About: the whole thing set large, one sentence at a time. Only the line you
 * are reading is in ink — the rest sit back in grey and come forward as you
 * scroll onto them.
 */
export function About({ onHome }: { onHome: () => void }) {
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
