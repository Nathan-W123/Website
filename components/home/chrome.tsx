'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { SendOff } from '@/components/signs/sendoff';
import './home.css';

/**
 * What every page of the redesign shares, laid out like the reference Nathan
 * picked: a plain row of links on the paper, centred over a rule that runs
 * the width of the page, one of his GIFs as a picture in the column under
 * them (Home has its ribbon beside the words instead), the words under that,
 * and the paper plane from the deployed home at the foot of every page.
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
 * The banners, each a loop in public/banner. Art's is a picture in a box,
 * Downloads/Rain_Garden_Still_Leaf.gif, drawn at the banner's shape (on a
 * phone's taller box, centred on the cat). Work's and Projects' are drawings
 * of fine lines with their off-white ground divided out
 * (work/ref/wave-encode.mjs), so they lie on the paper with no box, as
 * Home's ribbon does: on Work, Downloads/Infinity Ribbon.gif, whole; on
 * Projects, Downloads/Braided Wave Packet.gif, a wave function you collapse
 * by looking at it (Observed).
 */
const BANNERS = {
  infinity: { src: '/banner/infinity', look: 'is-drawing is-infinity' },
  wave: { src: '/banner/wave', look: 'is-drawing is-wave' },
  canopy: { src: '/banner/canopy', look: '' },
};
type Banner = keyof typeof BANNERS;

/**
 * The wave packet on Projects, observed: point at it and it collapses to a
 * narrow peak where you point (the whole packet squeezed in, its envelope
 * become a spike, still moving inside it) on the line it lies along, and
 * follows the pointer; look away and it spreads back out. A tap on a phone
 * observes it for a moment.
 */
function Observed({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState(false);
  const release = useRef<number | undefined>(undefined);
  const aim = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--ox', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
  };
  useEffect(() => () => window.clearTimeout(release.current), []);
  return (
    <div
      className={`nw-banner ${BANNERS.wave.look}${seen ? ' is-seen' : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        aim(e);
        setSeen(true);
      }}
      onPointerMove={(e) => e.pointerType === 'mouse' && aim(e)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setSeen(false)}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return;
        aim(e);
        setSeen(true);
        window.clearTimeout(release.current);
        release.current = window.setTimeout(() => setSeen(false), 1800);
      }}
    >
      {children}
    </div>
  );
}

/**
 * One of Nathan's GIFs as a loop that plays on any screen. `src` names four
 * files by their shared start: .webp, the first frame, which is in the HTML;
 * .webm and .mp4, the loop as a video, which takes over once the page runs;
 * and -anim.webp, the loop as an animated picture, for when the phone will
 * not play the video (an iPhone in Low Power Mode refuses all video
 * autoplay, and showed its big play button, which a banner did not even let
 * you press): pictures animate there. With reduced motion, only the first
 * frame.
 */
export function Loop({ src, className, position = '50% 50%' }: { src: string; className: string; position?: string }) {
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
      className={`nw-loop ${className}`}
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
      poster={`${src}.webp`}
    >
      <source src={`${src}.webm`} type="video/webm" />
      {/* the last file failing means neither plays here (the browser
          only waits, play() is never refused) */}
      <source src={`${src}.mp4`} type="video/mp4" onError={() => setMode('picture')} />
    </video>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`nw-loop ${className}`}
      // the animated picture is the bigger file: the first frame, already
      // here, shows behind it (cropped the same way) until it arrives
      style={
        mode === 'picture'
          ? { objectPosition: position, background: `url(${src}.webp) ${position} / cover no-repeat` }
          : { objectPosition: position }
      }
      src={`${src}${mode === 'picture' ? '-anim' : ''}.webp`}
      alt=""
      aria-hidden="true"
    />
  );
}

/** which banner a page wears, if any: none on Home (its ribbon is beside the words) or on Chess, which is all about the board */
export function Shell({ page, banner = false, children }: { page: Page; banner?: Banner | false; children: ReactNode }) {
  return (
    <div className="nw" id="top">
      <header className="nw-head">
        <nav className="nw-nav" aria-label="Site">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} aria-current={n.page === page ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
        {banner && (
          <div className="nw-col">
            {banner === 'wave' ? (
              <Observed>
                <Loop src={BANNERS.wave.src} className="nw-banner-media" />
              </Observed>
            ) : (
              <div className={`nw-banner ${BANNERS[banner].look}`}>
                <Loop src={BANNERS[banner].src} className="nw-banner-media" />
              </div>
            )}
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
