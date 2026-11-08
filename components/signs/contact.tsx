'use client';

import 'katex/dist/katex.min.css';
import { RibbonArt } from './about';
import { CONTACTS } from './content';
import { BrandIcon } from './icons';
import { PUZZLE_HTML, PUZZLE_STRING } from './puzzle';

/**
 * Contact, in About's language: a few lines at a size you can read, the same
 * row of marks, and Nathan's infinity ribbon where About has the morphing one.
 *
 * The email address is not on the page, or anywhere else on the site: it is
 * the answer to the puzzle below. The integral works out to exactly 2, which
 * picks the order of the scrambled characters.
 *
 * An NFC tag points straight here, so it is also a front door; the corner's
 * Home bubble is the way into the rest of the site.
 */
export function Contact() {
  return (
    <div className="hm ab2">
      <div className="ab2-body">
        <div className="ab2-col">
          <p className="ab2-line">Say hi.</p>
          <p className="ab2-line">Email is the quickest way to reach me.</p>
          <div className="ab2-puzzle">
            <p>
              Let <code>s = {PUZZLE_STRING}</code>, where <i>s</i>[<i>j</i>] is its <i>j</i>&#8209;th character, counting from 1. Evaluate
            </p>
            {/* typeset ahead of time by work/ref/puzzle-katex.mjs: our own markup, no input in it */}
            <div className="ab2-formula" dangerouslySetInnerHTML={{ __html: PUZZLE_HTML }} />
            <p className="ab2-puzzle-note">Concat joins the characters in order, and mod takes the remainder after division.</p>
          </div>
          <p className="ab2-line">I&apos;m happy to talk simulation, machine learning, commissions and anything else.</p>
          <p className="ab2-line ab2-socials">
            Or find me on
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
