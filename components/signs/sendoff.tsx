'use client';

import { useEffect, useRef, useState } from 'react';

// one cloud, drawn in a 32 x 14 box and placed and sized where it is used
const CLOUD = 'M4 13.5 C1.4 13.5 1.2 9.6 3.9 9.1 C3.9 6.1 7.6 5 9.4 6.9 C10.6 3.1 16.2 2.4 18 6.1 C20.2 4.2 24.6 5.4 24.6 8.7 C27.6 8.4 29.4 13.5 26.1 13.5 Z';

/**
 * The send-off at the foot of the home page: a paper plane holding its course
 * while clouds go by behind it, over a line in the site's own type. The plane
 * rides a slow swell and its trail flickers with it; the clouds drift past
 * from right to left, each at its own pace, fading in and out at the ends of
 * their run, so the plane reads as flying. Still under reduced motion, and
 * paused while it is off screen.
 */
export function SendOff() {
  const ref = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setRunning(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { rootMargin: '160px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`hm-sendoff${running ? ' is-running' : ''}`}>
      <svg className="hm-sendoff-sky" viewBox="0 0 240 64" aria-hidden="true" focusable="false">
        {/* each cloud: placed and sized by the outer groups, moved by the inner one */}
        <g transform="translate(0 7) scale(0.68)">
          <g className="hm-cloud-run" style={{ ['--t' as string]: '14s', ['--d' as string]: '-5s' }}>
            <path className="hm-cloud" d={CLOUD} />
          </g>
        </g>
        <g transform="translate(33 38) scale(1.18)">
          <g className="hm-cloud-run" style={{ ['--t' as string]: '19s', ['--d' as string]: '-11s' }}>
            <path className="hm-cloud" d={CLOUD} />
          </g>
        </g>
        <g transform="translate(205 0) scale(0.92)">
          <g className="hm-cloud-run" style={{ ['--t' as string]: '12s', ['--d' as string]: '-3s' }}>
            <path className="hm-cloud" d={CLOUD} />
          </g>
        </g>
        <path className="hm-plane-trail" d="M64 14.5 H74" />
        <g className="hm-plane">
          <polygon className="hm-plane-sheet" points="92,6 154,15.5 100.5,21.5" />
          <polygon className="hm-plane-wing" points="100.5,21.5 154,15.5 107.5,34" />
          <polygon className="hm-plane-keel" points="100.5,21.5 115,23.2 107.5,34" />
        </g>
      </svg>
      <p className="hm-sendoff-line">in pursuit of greatness</p>
    </div>
  );
}
