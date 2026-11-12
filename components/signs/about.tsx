'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ABOUT, CONTACTS, EMAIL } from './content';
import { BrandIcon } from './icons';

const base = () => (typeof window !== 'undefined' && window.__SIGNS_BASE) || '';

/**
 * One of Nathan's ribbon animations, frame for frame: a 160-frame GIF
 * re-encoded as a loop (8 s at 20 fps, same as the original) because the GIFs
 * are 8-10 MB, and multiplied onto the page so its white ground vanishes into
 * the cream. About has the morphing ribbon (its dark ground taken to white and
 * its lines to the page's soft grey, work/ref/ribbon-recolour.mjs); Contact has
 * the infinity ribbon (already on the cream, divided back out of it,
 * work/ref/infinity-encode.mjs). With reduced motion it holds on the first
 * frame.
 *
 * Those pages arrive as a sheet pulled up from below; starting a video decoder
 * in the same frame made the first step of that rise stall, so the ribbon rides
 * up as its own first frame and turns into the video 0.3 s in, when the fast
 * part of the rise is over (the sheet has come 97 % of the way), so the loop
 * is already running as the page arrives. Waiting for the sheet to land (it
 * was 0.7 s) left the ribbon standing still for a third of a second after the
 * page was visibly there.
 *
 * In the copies of About and Contact that ship in the HTML for a visit straight
 * to one of them (`copy`), the box is drawn empty: the copy on show paints the
 * first frame as a background (.sg-boot in signs.css), which is only fetched
 * for that copy, and the head script asks for it early. The page that takes
 * over then finds the picture already loaded.
 */
export function RibbonArt({ name = 'about/ribbon', copy = false }: { name?: string; copy?: boolean }) {
  const reduce = useReducedMotion();
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLive(true), 300);
    return () => window.clearTimeout(t);
  }, []);
  if (copy) return <div className="ab2-art" aria-hidden="true" />;
  return (
    <div className="ab2-art" aria-hidden="true">
      {reduce || !live ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ab2-art-media" src={`${base()}/${name}.webp`} alt="" />
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
          poster={`${base()}/${name}.webp`}
        >
          <source src={`${base()}/${name}.webm`} type="video/webm" />
          <source src={`${base()}/${name}.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

/**
 * About: a few paragraphs at a size you can actually read, held to the left of
 * the page, with the morphing ribbon on the right. No heading and nothing to
 * scroll — it is five sentences. The nav bar belongs to the route shell,
 * which is what keeps it still on the way in from the home page.
 */
export function About({ copy = false }: { copy?: boolean }) {
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
            {[...CONTACTS, EMAIL].map((c) => (
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
        <RibbonArt copy={copy} />
      </div>
    </div>
  );
}
