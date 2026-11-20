'use client';

import 'katex/dist/katex.min.css';
import '@/components/signs/katex-fonts.css';
import { CONTACTS } from '@/components/signs/content';
import { BrandIcon } from '@/components/signs/icons';
import { PUZZLE_HTML, PUZZLE_STRING } from '@/components/signs/puzzle';
import { Loop, Shell } from './chrome';

/**
 * Contact, as it was before the redesign, in the redesign's face and Home's
 * layout: the words on the left, Nathan's infinity ribbon on the right. The
 * email address is not written here: it is the answer to the puzzle (the
 * integral works out to exactly 2, which picks the order of the scrambled
 * characters, components/signs/puzzle.ts). The puzzle's s and j are set in
 * the formula's own math italic, so the line and the formula read as one.
 */
export function Contact() {
  return (
    <Shell page="contact">
      <section className="nw-col nw-home" aria-labelledby="nw-say-hi">
        <div className="nw-about">
          <h1 id="nw-say-hi">Say hi by solving this problem.</h1>
          <p>
            Let <span className="nw-puzzle-s"><span className="nw-var">s</span> = {PUZZLE_STRING}</span>, where <span className="nw-var">s</span>[
            <span className="nw-var">j</span>] is its <span className="nw-var">j</span>&#8209;th character, counting
            from&nbsp;1. Evaluate
          </p>
          <div className="nw-formula" dangerouslySetInnerHTML={{ __html: PUZZLE_HTML }} />
          <p className="nw-find">
            Or find me here
            {CONTACTS.map((c) => (
              <a key={c.id} href={c.href} target="_blank" rel="noreferrer" aria-label={c.label}>
                <BrandIcon id={c.id} size={29} />
              </a>
            ))}
          </p>
        </div>
        <div className="nw-ribbon is-infinity" aria-hidden="true">
          <Loop src="/banner/infinity" className="nw-ribbon-media" />
        </div>
      </section>
    </Shell>
  );
}
