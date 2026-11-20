'use client';

import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ART, WORKED_WITH, type ArtItem } from '@/components/signs/content';
import { Shell } from './chrome';
import { Zoom } from './peek';

/**
 * Art, laid out like Work and Projects: a line down the left with a dot at
 * each section, a sentence on what the section is, and the pieces in rows of
 * square pictures under it; a picture opens large with its name and what it
 * was made with. The last dot is who the work was for.
 */
const SECTIONS: { id: string; label: string; line: string }[] = [
  { id: 'shoes', label: 'Shoes', line: "Custom AF 1's, for people and organizations." },
  { id: 'drawing', label: 'Drawings', line: 'Drawings in Copic markers.' },
  { id: 'doodles', label: 'Doodles', line: 'Doodles in Copic markers and fineliner.' },
];

export function Art() {
  const [zoom, setZoom] = useState<ArtItem | null>(null);
  return (
    <Shell page="art" banner="shell">
      <section className="nw-col nw-section" aria-labelledby="nw-art">
        <h1 id="nw-art">Art</h1>
        <p className="nw-lede">Scroll and stay awhile.</p>
        <ol className="nw-timeline">
          {SECTIONS.map((s) => {
            const items = ART.find((a) => a.id === s.id)?.items ?? [];
            return (
              <li key={s.id}>
                <h2 className="nw-role">{s.label}</h2>
                <p className="nw-what">{s.line}</p>
                <ul className="nw-art">
                  {items.map((it) => (
                    <li key={it.image}>
                      <button type="button" className="nw-art-open" onClick={() => setZoom(it)} aria-label={`Open ${it.caption || s.label}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.image} alt="" loading="lazy" draggable={false} />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          <li>
            <h2 className="nw-role">Commissions</h2>
            <p className="nw-what">{WORKED_WITH.join(' · ')}</p>
          </li>
        </ol>
      </section>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {zoom && <Zoom key={zoom.image} src={zoom.image} caption={zoom.caption} note={zoom.materials.join(', ')} onClose={() => setZoom(null)} />}
          </AnimatePresence>,
          document.body,
        )}
    </Shell>
  );
}
