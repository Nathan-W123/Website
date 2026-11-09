'use client';

import 'katex/dist/katex.min.css';
import './katex-fonts.css';
import { RibbonArt } from './about';
import { CONTACTS } from './content';
import { BrandIcon } from './icons';
import { PUZZLE_HTML, PUZZLE_STRING } from './puzzle';

/**
 * Contact, in About's language: a few lines at one size, the same row of
 * marks, and Nathan's infinity ribbon where About has the morphing one.
 *
 * The email address is not on this page (About has it): here it is the answer
 * to the puzzle, which sits in the column as one more line, at the lines' size
 * and on their left edge. The integral works out to exactly 2,
 * which picks the order of the scrambled characters.
 *
 * An NFC tag points straight here, so it is also a front door; Home in the
 * bar is the way into the rest of the site.
 */
export function Contact() {
  return (
    <div className="hm ab2">
      <div className="ab2-body">
        <div className="ab2-col">
          <p className="ab2-line">Say hi.</p>
          <p className="ab2-line">Find my email by solving this problem.</p>
          <p className="ab2-line">
            Let <code className="ab2-code">s = {PUZZLE_STRING}</code>, where <i>s</i>[<i>j</i>] is its <i>j</i>&#8209;th
            character, counting from&nbsp;1. Evaluate
          </p>
          <div className="ab2-formula" dangerouslySetInnerHTML={{ __html: PUZZLE_HTML }} />
          <p className="ab2-line ab2-socials">
            Or find me here
            {CONTACTS.map((c) => (
              <a key={c.id} className="ab2-chip" href={c.href} target="_blank" rel="noreferrer" aria-label={c.label}>
                <BrandIcon id={c.id} size={23} />
              </a>
            ))}
          </p>
        </div>
        <RibbonArt name="contact/infinity" />
      </div>
    </div>
  );
}
