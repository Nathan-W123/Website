'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SendOff } from '@/components/signs/sendoff';
import './home.css';

/**
 * What every page of the redesign shares, laid out like the reference Nathan
 * picked: a plain row of links on the paper, his sunset study as a picture in
 * the column under them, the words under that, and the paper plane from the
 * deployed home at the foot of every page. The study is
 * Downloads/Sunset_Study_Three_Panes.gif with its black frame cropped off,
 * re-encoded as a loop (0.5 MB in place of 18.8 MB); the page shows its first
 * frame until the loop is ready, and only that frame with reduced motion.
 */

type Page = 'home' | 'work' | 'projects' | 'art' | 'chess';
const NAV: { page: Page; label: string; href: string }[] = [
  { page: 'home', label: 'Home', href: '/' },
  { page: 'work', label: 'Work', href: '/work/' },
  { page: 'projects', label: 'Projects', href: '/projects/' },
  { page: 'art', label: 'Art', href: '/art/' },
  { page: 'chess', label: 'Chess', href: '/chess/' },
];

/**
 * The banners, each a loop in public/banner (.webm, .mp4, and a .webp still):
 * the sunset study on most pages; on Work, Downloads/Red_Gable_by_the_Sea.gif
 * (16:9, so the banner's box shows a band of it, set to keep the red gable
 * and the sun on the sea).
 */
const BANNERS = {
  study: { file: 'study', position: '46% 50%' },
  gable: { file: 'gable', position: '50% 12%' },
};
type Banner = keyof typeof BANNERS;

function Loop({ which }: { which: Banner }) {
  const { file, position } = BANNERS[which];
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setLive(true);
  }, []);
  return live ? (
    <video
      className="nw-banner-media"
      style={{ objectPosition: position }}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      aria-hidden="true"
      poster={`/banner/${file}.webp`}
    >
      <source src={`/banner/${file}.webm`} type="video/webm" />
      <source src={`/banner/${file}.mp4`} type="video/mp4" />
    </video>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="nw-banner-media" style={{ objectPosition: position }} src={`/banner/${file}.webp`} alt="" aria-hidden="true" />
  );
}

/** which banner a page wears; `false` for a page that is all about what is on it, like the reference's game page */
export function Shell({ page, banner = 'study', children }: { page: Page; banner?: Banner | false; children: ReactNode }) {
  return (
    <div className="nw" id="top">
      <header className="nw-col nw-head">
        <nav className="nw-nav" aria-label="Site">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} aria-current={n.page === page ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        {banner && (
          <div className="nw-banner">
            <Loop which={banner} />
          </div>
        )}
      </header>
      <main>
        {children}
        <SendOff />
      </main>
    </div>
  );
}
