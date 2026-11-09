'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

// one cloud, drawn in a 32 x 14 box and sized where it is used
const CLOUD = 'M4 13.5 C1.4 13.5 1.2 9.6 3.9 9.1 C3.9 6.1 7.6 5 9.4 6.9 C10.6 3.1 16.2 2.4 18 6.1 C20.2 4.2 24.6 5.4 24.6 8.7 C27.6 8.4 29.4 13.5 26.1 13.5 Z';

// The clouds cross the whole sky from right to left, each at its own height,
// size and pace; the delay says how far along its crossing each one already
// is when the page loads, and `rest` is where it sits when motion is unwanted.
const CLOUDS = [
  { y: 6, s: 0.72, t: 17, d: -3.2, rest: -228 },
  { y: 56, s: 1.12, t: 13, d: -8.6, rest: -200 },
  { y: 26, s: 0.86, t: 21, d: -14.8, rest: -38 },
  { y: 70, s: 0.7, t: 19, d: -1.6, rest: -92 },
];

// the streaks off the plane's tail: height, length, pace and start
const DASHES = [
  { y: 37, l: 10, t: 1.5, d: 0 },
  { y: 44, l: 15, t: 1.9, d: -0.8 },
  { y: 51, l: 7, t: 1.3, d: -0.4 },
];

const vars = (o: Record<string, string>) => o as CSSProperties;

/**
 * The send-off at the foot of the home page: a paper plane holding its course
 * while the clouds go by. The plane wanders on a slow, uneven path (forward
 * and back on one rhythm, up and down with a tilt of the nose on another),
 * streaks stream back off its tail and fade, and the clouds cross the whole
 * sky behind it from right to left, fading in and out at the edges. Still
 * under reduced motion, and paused while it is off screen.
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
    <div ref={ref} className={`hm-sendoff${running ? ' is-running' : ''}`} aria-hidden="true">
      <svg className="hm-sendoff-sky" viewBox="0 0 240 90" focusable="false">
        {/* each cloud enters at the right edge: placed by the outer group, carried
            across by the middle one, sized by the inner one */}
        {CLOUDS.map((c, i) => (
          <g key={i} transform={`translate(240 ${c.y})`}>
            <g className="hm-cloud-run" style={vars({ '--t': `${c.t}s`, '--d': `${c.d}s`, '--rest': `${c.rest}px` })}>
              <g transform={`scale(${c.s})`}>
                <path className="hm-cloud" d={CLOUD} />
              </g>
            </g>
          </g>
        ))}
        <g className="hm-plane-drift">
          {DASHES.map((s, i) => (
            <path key={i} className="hm-dash" d={`M${86 - s.l} ${s.y} H86`} style={vars({ '--t': `${s.t}s`, '--d': `${s.d}s` })} />
          ))}
          <g className="hm-plane-sway">
            <polygon className="hm-plane-sheet" points="92,26 154,41.6 97.6,40.7" />
            <polygon className="hm-plane-wing" points="97.6,40.7 154,41.6 107.8,57.4" />
            <path className="hm-plane-fold" d="M98.6 43.4 L153 41.8" />
            <polygon className="hm-plane-keel" points="93.4,50.5 103.4,47.4 107.8,57.4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
