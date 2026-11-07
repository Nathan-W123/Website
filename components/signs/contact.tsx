'use client';

import { RibbonArt } from './about';
import { CONTACTS } from './content';
import { BrandIcon } from './icons';

/**
 * Contact, in About's language: a few lines at a size you can read, the
 * address as a link in its sentence, the same row of marks, and the ribbon.
 * An NFC tag points straight here, so it is also a front door; the corner's
 * Home bubble is the way into the rest of the site.
 */
export function Contact() {
  const email = CONTACTS.find((c) => c.id === 'email');
  const elsewhere = CONTACTS.filter((c) => c.id !== 'email');
  return (
    <div className="hm ab2">
      <div className="ab2-body">
        <div className="ab2-col">
          <p className="ab2-line">Say hi.</p>
          {email && (
            <p className="ab2-line">
              Email is the quickest way to reach me:{' '}
              <a className="ab2-link" href={email.href}>
                {email.handle}
              </a>
            </p>
          )}
          <p className="ab2-line">I&apos;m happy to talk simulation, machine learning, commissions and anything else.</p>
          <p className="ab2-line ab2-socials">
            Or find me on
            {elsewhere.map((c) => (
              <a key={c.id} className="ab2-chip" href={c.href} target="_blank" rel="noreferrer" aria-label={c.label}>
                <BrandIcon id={c.id} size={23} />
              </a>
            ))}
          </p>
        </div>
        <RibbonArt />
      </div>
    </div>
  );
}
