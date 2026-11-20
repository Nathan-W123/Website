'use client';

import { useEffect, useState, type ReactNode } from 'react';
import './home.css';

/**
 * What every page of the redesign shares, laid out like the reference Nathan
 * picked: a plain row of links on the paper, his sunset study as a picture in
 * the column under them, and the words under that. The study is
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

function Study() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setLive(true);
  }, []);
  return live ? (
    <video
      className="nw-banner-media"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      aria-hidden="true"
      poster="/banner/study.webp"
    >
      <source src="/banner/study.webm" type="video/webm" />
      <source src="/banner/study.mp4" type="video/mp4" />
    </video>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="nw-banner-media" src="/banner/study.webp" alt="" aria-hidden="true" />
  );
}

/** `banner={false}` for a page that is all about what is on it, like the reference's game page */
export function Shell({ page, banner = true, children }: { page: Page; banner?: boolean; children: ReactNode }) {
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
            <Study />
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
