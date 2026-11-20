'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
 * The banners, each a loop in public/banner (.webm, .mp4, a .webp still, and
 * an animated -anim.webp for phones that will not play the video):
 * the sunset study on Home; on Work, Downloads/Red_Gable_900x292.gif, on
 * Projects, Downloads/Golden_Meadow.gif, and on Art,
 * Downloads/Rain_Garden_Still_Leaf.gif, all three drawn at the banner's own
 * shape (on a phone's taller box, centred on the house, the oak and the cat).
 */
const BANNERS = {
  study: { file: 'study', position: '46% 50%' },
  gable: { file: 'gable', position: '55% 50%' },
  meadow: { file: 'meadow', position: '58% 50%' },
  canopy: { file: 'canopy', position: '50% 50%' },
};
type Banner = keyof typeof BANNERS;

/**
 * A banner: its first frame in the HTML, then the loop as a video; and when
 * the phone will not play the video (an iPhone in Low Power Mode refuses all
 * video autoplay, and showed its big play button, which the banner did not
 * even let you press), the same loop as an animated picture, which it plays.
 * With reduced motion, only the first frame.
 */
function Loop({ which }: { which: Banner }) {
  const { file, position } = BANNERS[which];
  const [mode, setMode] = useState<'still' | 'video' | 'picture'>('still');
  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMode('video');
  }, []);
  // muted as an attribute as well as a property (React only sets the
  // property, and iOS Safari judges autoplay by the attribute), then started
  // by hand, so a refusal can be caught
  const start = useCallback((v: HTMLVideoElement | null) => {
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.play()?.catch((e: unknown) => {
      // refused; not an AbortError, which only means the video left the page
      if (e instanceof DOMException && e.name === 'NotAllowedError') setMode('picture');
    });
  }, []);
  return mode === 'video' ? (
    <video
      ref={start}
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
      {/* the last file failing means neither plays here (the browser
          only waits, play() is never refused) */}
      <source src={`/banner/${file}.mp4`} type="video/mp4" onError={() => setMode('picture')} />
    </video>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="nw-banner-media"
      // the animated picture is the bigger file: the first frame, already
      // here, shows behind it (cropped the same way) until it arrives
      style={
        mode === 'picture'
          ? { objectPosition: position, background: `url(/banner/${file}.webp) ${position} / cover no-repeat` }
          : { objectPosition: position }
      }
      src={`/banner/${file}${mode === 'picture' ? '-anim' : ''}.webp`}
      alt=""
      aria-hidden="true"
    />
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
