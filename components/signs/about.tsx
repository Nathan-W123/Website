'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ABOUT, CONTACTS } from './content';
import { BrandIcon } from './icons';

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

/**
 * About: a few paragraphs at a size you can actually read, held to the left of
 * the page, with the morphing ribbon on the right. No heading and nothing to
 * scroll — it is five sentences. The corner mark belongs to the route shell,
 * which is what keeps it still on the way in from the home page.
 *
 * The ribbon is Nathan's own animation, frame for frame: the 160-frame GIF
 * re-encoded as a loop (8 s at 20 fps, same as the original) because the GIF
 * itself is 10 MB, with its dark ground taken to white and its lines to the
 * page's soft grey (work/ref/ribbon-recolour.mjs). With reduced motion it
 * holds on the first frame.
 */
export function About() {
  const reduce = useReducedMotion();
  // the page arrives as a sheet pulled up from below; starting a video decoder in
  // the same frame made the first step of that rise stall, so the ribbon rides
  // up as its own first frame and only turns into the video once the sheet lands
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLive(true), 700);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="hm ab2">
      <div className="ab2-body">
        <div className="ab2-col">
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

        <div className="ab2-art" aria-hidden="true">
          {reduce || !live ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="ab2-art-media" src={`${base()}/about/ribbon.webp`} alt="" />
          ) : (
            // decoration, not a player: no picture-in-picture button on hover, no cast
            // button, and (in the CSS) no pointer at all, so no context menu either
            <video
              className="ab2-art-media"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              tabIndex={-1}
              poster={`${base()}/about/ribbon.webp`}
            >
              <source src={`${base()}/about/ribbon.webm`} type="video/webm" />
              <source src={`${base()}/about/ribbon.mp4`} type="video/mp4" />
            </video>
          )}
        </div>
      </div>
    </div>
  );
}
