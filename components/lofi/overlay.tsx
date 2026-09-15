'use client';

import { BoardWriting, BookTitle, LampStand, LaptopSticker, PropDefs, WallWhiteboard } from './props';
import type { RoomArt } from './room';

/**
 * Animation layer drawn over the painting, in the painting's pixel space:
 * birds and clouds through the window, sun rays into the room, a breathing
 * horizon glow, lamp glow, steam off the mug, and dust in the sunbeam.
 */

/* ---------- birds ---------- */

const WINGS_UP = 'M 0 0 C -4 -3 -9 -10 -15 -15 L -12 -8 C -8 -5 -4 -2 0 2 C 4 -2 8 -5 12 -8 L 15 -15 C 9 -10 4 -3 0 0 Z';
const WINGS_MID = 'M 0 0 C -5 -2 -10 -4 -16 -5 L -14 0 C -9 1 -4 2 0 2 C 4 2 9 1 14 0 L 16 -5 C 10 -4 5 -2 0 0 Z';
const WINGS_DOWN = 'M 0 0 C -5 2 -10 5 -15 9 L -13 12 C -8 8 -4 4 0 2 C 4 4 8 8 13 12 L 15 9 C 10 5 5 2 0 0 Z';

function Bird({ size, flap, delay }: { size: number; flap: number; delay: number }) {
  return (
    <g transform={`scale(${size})`} fill="#6b4634" opacity={0.85}>
      <path>
        <animate attributeName="d" values={`${WINGS_UP};${WINGS_MID};${WINGS_DOWN};${WINGS_MID};${WINGS_UP}`} keyTimes="0;0.3;0.5;0.75;1" dur={`${flap}s`} begin={`${delay}s`} repeatCount="indefinite" />
      </path>
      <ellipse cx={0} cy={1} rx={3.6} ry={1.9} />
      <circle cx={3.6} cy={0} r={1.4} />
    </g>
  );
}

/** A wavy flight path across the window opening. */
function flightPath(o: RoomArt['windowOpening'], yFrac: number, reverse: boolean, amp: number) {
  const pad = 40;
  const x0 = reverse ? o.x + o.w + pad : o.x - pad;
  const x1 = reverse ? o.x - pad : o.x + o.w + pad;
  const y = o.y + o.h * yFrac;
  const n = 4;
  const seg = (x1 - x0) / n;
  let d = `M ${x0} ${y}`;
  for (let i = 0; i < n; i++) {
    const cx = x0 + seg * (i + 0.5);
    const cy = y + (i % 2 === 0 ? -amp : amp);
    d += ` Q ${cx} ${cy} ${x0 + seg * (i + 1)} ${y}`;
  }
  return d;
}

const FLIGHTS = [
  { dur: 28, begin: 1, yFrac: 0.26, amp: 18, reverse: false, flock: [[0, 0, 1.5], [-42, 18, 1.25], [-80, 38, 1.05]] as [number, number, number][] },
  { dur: 36, begin: 14, yFrac: 0.42, amp: 12, reverse: true, flock: [[0, 0, 1.0]] as [number, number, number][] },
  { dur: 32, begin: 24, yFrac: 0.16, amp: 22, reverse: false, flock: [[0, 0, 0.9], [-34, -14, 0.8]] as [number, number, number][] },
];

/* ---------- dust ---------- */

const MOTES = Array.from({ length: 18 }, (_, i) => ({
  fx: ((i * 37) % 100) / 100,
  fy: ((i * 53 + 17) % 100) / 100,
  r: 2 + (i % 3),
  dur: 9 + (i % 5) * 2.5,
  delay: -(i * 1.7),
}));

/* ---------- rays ---------- */

const RAYS = [
  { x: 0.18, w: 0.09, lean: 0.55, spread: 1.7, o: 0.55, sway: 12 },
  { x: 0.34, w: 0.05, lean: 0.5, spread: 1.9, o: 0.4, sway: 9 },
  { x: 0.47, w: 0.12, lean: 0.48, spread: 1.6, o: 0.6, sway: 14 },
  { x: 0.66, w: 0.06, lean: 0.44, spread: 2.0, o: 0.4, sway: 8 },
  { x: 0.8, w: 0.1, lean: 0.4, spread: 1.7, o: 0.5, sway: 11 },
];

export function Overlay({ art }: { art: RoomArt }) {
  const o = art.windowOpening;
  const floorY = art.height + 40;
  const rayLength = floorY - o.y;

  return (
    <svg className="lf-overlay" viewBox={`0 0 ${art.width} ${art.height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id="lf-clip-window">
          <rect x={o.x} y={o.y} width={o.w} height={o.h} />
        </clipPath>
        <radialGradient id="lf-sunglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1cf" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#ffd9a4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffc98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lf-lampglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6b0" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#ffd08a" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffc070" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lf-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff0cc" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#ffe6bd" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffdca8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lf-deskpool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3d4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe3b0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lf-steam-fade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {art.mug && (
          <mask
            id="lf-steam-mask"
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x={0}
            y={art.mug.y - 320}
            width={art.width}
            height={320}
          >
            <rect x={0} y={art.mug.y - 320} width={art.width} height={320} fill="url(#lf-steam-fade)" />
          </mask>
        )}
        <filter id="lf-blur-cloud" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="lf-blur-steam" filterUnits="userSpaceOnUse" x={-260} y={-320} width={520} height={360}>
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="lf-blur-ray" x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="lf-blur-mote" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id="lf-blur-shadow" x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <PropDefs />
      </defs>

      {/* The glow can spill softly past the panes; clipping its radial fade creates hard vertical seams. */}
      <circle className="lf-sun" cx={art.sun.x} cy={art.sun.y} r={art.sun.r} fill="url(#lf-sunglow)" style={{ mixBlendMode: 'screen' }} />

      {/* clouds and birds stay physically inside the window */}
      <g clipPath="url(#lf-clip-window)">
        <g filter="url(#lf-blur-cloud)" style={{ mixBlendMode: 'soft-light' }}>
          <g className="lf-cloud" style={{ ['--dur' as string]: '140s', ['--shift' as string]: `${o.w * 1.4}px`, ['--delay' as string]: '-30s' }}>
            <ellipse cx={o.x + o.w * 0.15} cy={o.y + o.h * 0.22} rx={90} ry={26} fill="#fff" opacity={0.9} />
            <ellipse cx={o.x + o.w * 0.2} cy={o.y + o.h * 0.2} rx={50} ry={30} fill="#fff" opacity={0.9} />
          </g>
          <g className="lf-cloud" style={{ ['--dur' as string]: '190s', ['--shift' as string]: `${o.w * 1.4}px`, ['--delay' as string]: '-110s' }}>
            <ellipse cx={o.x + o.w * 0.55} cy={o.y + o.h * 0.34} rx={110} ry={30} fill="#fff" opacity={0.8} />
            <ellipse cx={o.x + o.w * 0.6} cy={o.y + o.h * 0.31} rx={60} ry={36} fill="#fff" opacity={0.8} />
          </g>
          <g className="lf-cloud" style={{ ['--dur' as string]: '230s', ['--shift' as string]: `${o.w * 1.4}px`, ['--delay' as string]: '-70s' }}>
            <ellipse cx={o.x + o.w * 0.85} cy={o.y + o.h * 0.12} rx={70} ry={20} fill="#fff" opacity={0.7} />
          </g>
        </g>
        {FLIGHTS.map((f, i) => (
          <g key={i} opacity={0}>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" />
            <animateMotion dur={`${f.dur}s`} begin={`${f.begin}s`} repeatCount="indefinite" path={flightPath(o, f.yFrac, f.reverse, f.amp)} rotate="auto" calcMode="linear" />
            <g transform={f.reverse ? 'scale(-1 1)' : undefined}>
              {f.flock.map(([dx, dy, s], j) => (
                <g key={j} transform={`translate(${dx} ${dy})`}>
                  <Bird size={s} flap={0.36 + s * 0.14} delay={j * 0.11 + i * 0.07} />
                </g>
              ))}
            </g>
          </g>
        ))}
      </g>

      {/* sun rays into the room */}
      <g className="lf-rays" filter="url(#lf-blur-ray)" style={{ mixBlendMode: 'screen' }}>
        {RAYS.map((r, i) => {
          const x0 = o.x + o.w * r.x;
          const w0 = o.w * r.w;
          const x1 = x0 - rayLength * r.lean;
          const w1 = w0 * r.spread;
          return (
            <polygon
              key={i}
              className="lf-ray"
              style={{ ['--o' as string]: r.o, ['--sway' as string]: `${r.sway}px`, ['--dur' as string]: `${14 + i * 3}s`, ['--delay' as string]: `${-i * 4}s` }}
              points={`${x0},${o.y} ${x0 + w0},${o.y} ${x1 + w1},${floorY} ${x1},${floorY}`}
              fill="url(#lf-ray)"
            />
          );
        })}
      </g>
      {/* the pool of light on the desk */}
      <ellipse className="lf-pool" cx={art.lightBeam.x + art.lightBeam.w * 0.45} cy={art.lightBeam.y + art.lightBeam.h * 0.98} rx={art.lightBeam.w * 0.55} ry={art.lightBeam.h * 0.14} fill="url(#lf-deskpool)" style={{ mixBlendMode: 'soft-light' }} />

      {/* lamp */}
      {art.lamp && <circle className="lf-lamp" cx={art.lamp.x} cy={art.lamp.y} r={art.lamp.r} fill="url(#lf-lampglow)" style={{ mixBlendMode: 'screen' }} />}

      {/* steam: rises from the rim, never drawn over the cup */}
      {art.mug && (
        <g mask="url(#lf-steam-mask)">
          <g className="lf-steam" filter="url(#lf-blur-steam)" stroke="#fff9f0" fill="none" strokeLinecap="round" transform={`translate(${art.mug.x} ${art.mug.y})`}>
            <path className="lf-wisp lf-wisp-1" d="M -24 -4 C -46 -34 -2 -56 -22 -88 C -42 -118 4 -136 -16 -168" strokeWidth={14}>
              <animate attributeName="d" values="M -24 -4 C -46 -34 -2 -56 -22 -88 C -42 -118 4 -136 -16 -168;M -24 -4 C -4 -34 -44 -56 -20 -88 C 0 -118 -40 -136 -18 -168;M -24 -4 C -46 -34 -2 -56 -22 -88 C -42 -118 4 -136 -16 -168" dur="7s" repeatCount="indefinite" />
            </path>
            <path className="lf-wisp lf-wisp-2" d="M 4 -2 C 34 -34 -20 -60 12 -96 C 40 -128 -14 -148 14 -186" strokeWidth={18}>
              <animate attributeName="d" values="M 4 -2 C 34 -34 -20 -60 12 -96 C 40 -128 -14 -148 14 -186;M 4 -2 C -24 -34 30 -60 2 -96 C -22 -128 30 -148 6 -186;M 4 -2 C 34 -34 -20 -60 12 -96 C 40 -128 -14 -148 14 -186" dur="8.5s" repeatCount="indefinite" />
            </path>
            <path className="lf-wisp lf-wisp-3" d="M 30 -4 C 10 -30 50 -50 28 -80 C 8 -108 46 -124 30 -154" strokeWidth={11}>
              <animate attributeName="d" values="M 30 -4 C 10 -30 50 -50 28 -80 C 8 -108 46 -124 30 -154;M 30 -4 C 50 -30 10 -50 32 -80 C 52 -108 14 -124 30 -154;M 30 -4 C 10 -30 50 -50 28 -80 C 8 -108 46 -124 30 -154" dur="6.5s" repeatCount="indefinite" />
            </path>
          </g>
        </g>
      )}

      {/* lettering and props the placeholder painting lacks */}
      {art.bookTitle && <BookTitle m={art.bookTitle} />}
      {art.laptopSticker && <LaptopSticker {...art.laptopSticker} />}
      {art.whiteboard && <WallWhiteboard {...art.whiteboard} />}
      {art.lampStand && <LampStand {...art.lampStand} />}
      {art.boardWriting && <BoardWriting {...art.boardWriting} />}

      {/* dust in the sunbeam */}
      <g filter="url(#lf-blur-mote)" fill="#fff3d6">
        {MOTES.map((m, i) => (
          <circle key={i} className="lf-mote" cx={art.lightBeam.x + art.lightBeam.w * m.fx} cy={art.lightBeam.y + art.lightBeam.h * m.fy} r={m.r} style={{ ['--dur' as string]: `${m.dur}s`, ['--delay' as string]: `${m.delay}s` }} />
        ))}
      </g>
    </svg>
  );
}
