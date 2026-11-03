'use client';

import { ABOUT, CONTACTS } from './content';
import { Corner, type Side } from './corner';
import { BrandIcon } from './icons';

/**
 * About: a few paragraphs at a size you can actually read, and the ways to
 * reach me under them. No heading and nothing to scroll — it is five sentences.
 */
export function About({ onHome, side }: { onHome: () => void; side: Side }) {
  return (
    <div className="hm ab2">
      <Corner side={side} onClick={onHome} label="Back home" say="Back home" />

      <div className="ab2-body">
        {ABOUT.paragraphs.map((p) => (
          <p key={p} className="ab2-line">
            {p}
          </p>
        ))}
        {/* out on the page: a row you have to keep hovered is a row you cannot click */}
        <p className="ab2-line ab2-socials">
          Find me on
          {CONTACTS.map((c) => (
            <a
              key={c.id}
              className="ab2-chip"
              href={c.href}
              target={c.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
              aria-label={c.label}
            >
              <BrandIcon id={c.id} size={23} />
            </a>
          ))}
        </p>
      </div>
    </div>
  );
}
